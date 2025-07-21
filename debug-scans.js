// Debug script to check for problematic scans
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require("convex/browser");

console.log("Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function debugScans() {
    try {
        console.log("Fetching all scans...");
        const scans = await client.query("scans:getScans", { limit: 100 });

        console.log(`Found ${scans.length} scans:`);

        scans.forEach((scan, index) => {
            console.log(`\n${index + 1}. ${scan.name}`);
            console.log(`   ID: ${scan._id}`);
            console.log(`   URL: ${scan.url}`);
            console.log(`   Type: ${scan.documentType}`);
            console.log(`   Created: ${new Date(scan.createdAt).toISOString()}`);

            // Check if this is a problematic local file path
            if (!scan.url.startsWith("http") && scan.url.includes("test/data")) {
                console.log(`   ⚠️  PROBLEMATIC: This appears to be a test file that may not exist`);
            }
        });

        // Also check analysis records for each scan
        console.log("\n\nChecking analysis records for each scan...");
        for (const scan of scans) {
            try {
                const analyses = await client.query("analysis:getAnalysisByScan", { scanId: scan._id });
                console.log(`\nScan "${scan.name}" has ${analyses.length} analysis records:`);

                analyses.forEach((analysis, index) => {
                    console.log(`  ${index + 1}. Analysis ID: ${analysis._id}`);
                    console.log(`     Status: ${analysis.status}`);
                    console.log(`     Created: ${new Date(analysis.createdAt).toISOString()}`);
                    if (analysis.status === "failed") {
                        console.log(`     ❌ FAILED: ${analysis.summary}`);
                    }
                });
            } catch (error) {
                console.log(`Could not fetch analysis records for scan ${scan._id}:`, error.message);
            }
        }

    } catch (error) {
        console.error("Error fetching scans:", error);
    }
}

debugScans();