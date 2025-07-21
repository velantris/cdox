// Debug script to check issues for existing analyses
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require("convex/browser");

console.log("Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function debugIssues() {
    try {
        console.log("Fetching all scans and their issues...");
        const scans = await client.query("scans:getScans", { limit: 100 });

        for (const scan of scans) {
            console.log(`\n=== Scan: ${scan.name} ===`);
            console.log(`ID: ${scan._id}`);
            console.log(`URL: ${scan.url}`);
            console.log(`Type: ${scan.documentType}`);

            // Get analyses for this scan
            const analyses = await client.query("analysis:getAnalysisByScan", { scanId: scan._id });

            for (const analysis of analyses) {
                console.log(`\n--- Analysis: ${analysis._id} ---`);
                console.log(`Status: ${analysis.status}`);
                console.log(`Score: ${analysis.score}`);
                console.log(`Summary: ${analysis.summary.substring(0, 200)}...`);
                console.log(`Recommendations: ${analysis.recommendations.length} items`);

                // Get issues for this analysis
                try {
                    const issues = await client.query("issues:getIssuesByAnalysis", { analysisId: analysis._id });
                    console.log(`Issues found: ${issues.length}`);

                    if (issues.length > 0) {
                        issues.forEach((issue, index) => {
                            console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
                            console.log(`     Section: ${issue.section}`);
                            console.log(`     Original: ${issue.originalText.substring(0, 100)}...`);
                            console.log(`     Issue: ${issue.issueExplanation.substring(0, 100)}...`);
                        });
                    } else {
                        console.log("  No issues found - this might indicate PDF parsing problems!");
                    }
                } catch (error) {
                    console.log(`  Error fetching issues: ${error.message}`);
                }
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

debugIssues();