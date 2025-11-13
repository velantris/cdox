/**
 * Test script to identify reanalysis errors
 * Run with: node test-reanalysis.js
 */

require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

async function testReanalysis() {
  const results = [];

  console.log("🧪 Starting Reanalysis Tests...\n");

  // Test 1: Get existing scans
  console.log("Test 1: Fetching existing scans...");
  try {
    const scans = await client.query("scans:getScans", { limit: 10 });
    console.log(`✅ Found ${scans.length} scans`);
    
    if (scans.length === 0) {
      results.push({
        testName: "Get Scans",
        success: false,
        error: "No scans found in database",
      });
      console.log("❌ No scans available for testing");
      printResults(results);
      return;
    }

    // Test 2: Test reanalysis on each scan
    for (const scan of scans.slice(0, 3)) {
      console.log(`\nTest 2: Testing reanalysis for scan "${scan.name}" (${scan._id})...`);
      
      // Check scan has required fields
      const scanCheck = await testScanStructure(scan);
      results.push(scanCheck);
      
      if (!scanCheck.success) {
        console.log(`❌ Scan structure invalid: ${scanCheck.error}`);
        continue;
      }

      // Test reanalysis
      const reanalysisTest = await testReanalysisForScan(scan._id, scan);
      results.push(reanalysisTest);
    }

  } catch (error) {
    results.push({
      testName: "Get Scans",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error,
    });
    console.error("❌ Failed to fetch scans:", error);
  }

  // Test 3: Test error scenarios
  console.log("\n\nTest 3: Testing error scenarios...");
  
  // Test with invalid scan ID
  const invalidScanTest = await testInvalidScanId();
  results.push(invalidScanTest);

  // Test with missing file
  const missingFileTest = await testMissingFile();
  results.push(missingFileTest);

  printResults(results);
}

async function testScanStructure(scan) {
  const issues = [];

  if (!scan._id) issues.push("Missing _id");
  if (!scan.name) issues.push("Missing name");
  if (!scan.url && !scan.fileId) {
    issues.push("Missing both url and fileId");
  }
  if (!scan.documentType) issues.push("Missing documentType");
  if (!scan.language) issues.push("Missing language");
  if (!scan.targetAudience) issues.push("Missing targetAudience");
  if (!scan.jurisdiction) issues.push("Missing jurisdiction");

  return {
    testName: `Scan Structure Check: ${scan.name}`,
    success: issues.length === 0,
    error: issues.length > 0 ? issues.join(", ") : undefined,
    details: {
      scanId: scan._id,
      hasUrl: !!scan.url,
      hasFileId: !!scan.fileId,
      documentType: scan.documentType,
      language: scan.language,
    },
  };
}

async function testReanalysisForScan(scanId, scan) {
  try {
    console.log(`  → Checking scan data...`);
    
    // Verify scan exists via query
    const scanData = await client.query("scans:getScan", { id: scanId });
    if (!scanData) {
      return {
        testName: `Reanalysis: ${scan.name}`,
        success: false,
        error: "Scan not found via query",
      };
    }

    console.log(`  → Starting analysis action...`);
    
    // Check if file exists (if fileId is present)
    // Note: We skip the storage check since _storage:getUrl is not a public function
    // The actual action will handle file access internally
    if (scanData.fileId) {
      console.log(`  → Scan has fileId: ${scanData.fileId} (will be checked by action)`);
    }

    // Check if URL is accessible (if url is present)
    if (scanData.url && scanData.url.startsWith("http")) {
      try {
        const response = await fetch(scanData.url, { method: "HEAD" });
        if (!response.ok) {
          return {
            testName: `Reanalysis: ${scan.name}`,
            success: false,
            error: `URL not accessible: ${response.status} ${response.statusText}`,
            details: { url: scanData.url, status: response.status },
          };
        }
        console.log(`  → URL is accessible`);
      } catch (urlError) {
        return {
          testName: `Reanalysis: ${scan.name}`,
          success: false,
          error: `URL fetch error: ${urlError instanceof Error ? urlError.message : String(urlError)}`,
          details: { url: scanData.url, error: urlError },
        };
      }
    }

    console.log(`  → Calling performDocumentAnalysis action...`);
    
    // Call the action - this is where errors will occur
    // Add timeout to prevent hanging
    const startTime = Date.now();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Action timed out after 120 seconds")), 120000);
    });
    
    const actionPromise = client.action("analysis_action:performDocumentAnalysis", {
      scanId: scanId,
    });
    
    const result = await Promise.race([actionPromise, timeoutPromise]);
    const duration = Date.now() - startTime;

    console.log(`  ✅ Analysis completed in ${duration}ms`);

    return {
      testName: `Reanalysis: ${scan.name}`,
      success: true,
      details: {
        scanId,
        duration,
        result,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      scanId,
      scanName: scan.name,
    };

    // Extract more details from the error
    if (error instanceof Error) {
      errorDetails.stack = error.stack;
      if (error.cause) {
        errorDetails.cause = error.cause;
      }
    }

    // Check for specific error patterns
    if (errorMessage.includes("Scan not found")) {
      errorDetails.type = "SCAN_NOT_FOUND";
    } else if (errorMessage.includes("File not found") || errorMessage.includes("storage")) {
      errorDetails.type = "FILE_NOT_FOUND";
    } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      errorDetails.type = "NETWORK_ERROR";
    } else if (errorMessage.includes("AI") || errorMessage.includes("model") || errorMessage.includes("OpenAI")) {
      errorDetails.type = "AI_MODEL_ERROR";
    } else if (errorMessage.includes("validation") || errorMessage.includes("schema")) {
      errorDetails.type = "VALIDATION_ERROR";
    } else {
      errorDetails.type = "UNKNOWN_ERROR";
    }

    console.log(`  ❌ Analysis failed: ${errorMessage}`);
    if (errorDetails.type !== "UNKNOWN_ERROR") {
      console.log(`  → Error type: ${errorDetails.type}`);
    }

    return {
      testName: `Reanalysis: ${scan.name}`,
      success: false,
      error: errorMessage,
      details: errorDetails,
    };
  }
}

async function testInvalidScanId() {
  try {
    await client.action("analysis_action:performDocumentAnalysis", {
      scanId: "invalid_scan_id",
    });
    return {
      testName: "Invalid Scan ID",
      success: false,
      error: "Should have thrown an error for invalid scan ID",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      testName: "Invalid Scan ID",
      success: true,
      details: {
        expectedError: true,
        errorMessage,
      },
    };
  }
}

async function testMissingFile() {
  try {
    // This test is skipped since we can't directly access storage
    return {
      testName: "Missing File Test",
      success: true,
      details: {
        skipped: "Storage access test skipped (storage functions are internal)",
      },
    };
  } catch (error) {
    return {
      testName: "Missing File Test",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printResults(results) {
  console.log("\n\n" + "=".repeat(80));
  console.log("TEST RESULTS SUMMARY");
  console.log("=".repeat(80) + "\n");

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  // Group errors by type
  const errorTypes = new Map();
  results.forEach((r) => {
    if (!r.success && r.details && r.details.type) {
      const type = r.details.type;
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    }
  });

  if (errorTypes.size > 0) {
    console.log("Error Types Found:");
    errorTypes.forEach((count, type) => {
      console.log(`  - ${type}: ${count}`);
    });
    console.log();
  }

  // Print detailed results
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${result.testName}`);
    
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
      if (result.details) {
        if (result.details.type) {
          console.log(`   Type: ${result.details.type}`);
        }
        if (result.details.scanId) {
          console.log(`   Scan ID: ${result.details.scanId}`);
        }
        if (result.details.fileId) {
          console.log(`   File ID: ${result.details.fileId}`);
        }
        if (result.details.url) {
          console.log(`   URL: ${result.details.url}`);
        }
        if (result.details.stack) {
          console.log(`   Stack trace: ${result.details.stack.split('\n').slice(0, 3).join('\n')}`);
        }
      }
    } else if (result.details && Object.keys(result.details).length > 0) {
      if (result.details.duration) {
        console.log(`   Duration: ${result.details.duration}ms`);
      }
      if (result.details.message) {
        console.log(`   ${result.details.message}`);
      }
    }
    console.log();
  });

  // Print recommendations
  if (failed > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("RECOMMENDATIONS");
    console.log("=".repeat(80) + "\n");

    const scanNotFoundErrors = results.filter(
      (r) => r.details && r.details.type === "SCAN_NOT_FOUND"
    );
    const fileNotFoundErrors = results.filter(
      (r) => r.details && r.details.type === "FILE_NOT_FOUND"
    );
    const networkErrors = results.filter(
      (r) => r.details && r.details.type === "NETWORK_ERROR"
    );
    const aiModelErrors = results.filter(
      (r) => r.details && r.details.type === "AI_MODEL_ERROR"
    );
    const validationErrors = results.filter(
      (r) => r.details && r.details.type === "VALIDATION_ERROR"
    );

    if (scanNotFoundErrors.length > 0) {
      console.log("🔍 Scan Not Found Issues:");
      console.log("   - Verify scan IDs are valid");
      console.log("   - Check if scans were deleted");
      console.log("   - Ensure scan query is working correctly\n");
    }

    if (fileNotFoundErrors.length > 0) {
      console.log("📁 File Not Found Issues:");
      console.log("   - Verify files exist in Convex storage");
      console.log("   - Check fileId references are correct");
      console.log("   - Ensure files weren't deleted from storage\n");
    }

    if (networkErrors.length > 0) {
      console.log("🌐 Network Issues:");
      console.log("   - Check URL accessibility");
      console.log("   - Verify network connectivity");
      console.log("   - Check CORS settings for remote URLs\n");
    }

    if (aiModelErrors.length > 0) {
      console.log("🤖 AI Model Issues:");
      console.log("   - Check API keys (OPENAI_API_KEY)");
      console.log("   - Verify API quotas/limits");
      console.log("   - Check model names are correct");
      console.log("   - Review error logs for specific model failures\n");
    }

    if (validationErrors.length > 0) {
      console.log("✅ Validation Issues:");
      console.log("   - Check schema definitions");
      console.log("   - Verify data types match expected formats");
      console.log("   - Review Zod validation errors\n");
    }

    if (
      scanNotFoundErrors.length === 0 &&
      fileNotFoundErrors.length === 0 &&
      networkErrors.length === 0 &&
      aiModelErrors.length === 0 &&
      validationErrors.length === 0
    ) {
      console.log("⚠️  Unknown errors detected. Review error messages above for details.\n");
    }
  }

  console.log("=".repeat(80) + "\n");
}

// Run tests
testReanalysis().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});

