// Test script to trigger a new analysis with fixed PDF parsing
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require("convex/browser");

console.log("Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function testPdfParsing() {
    try {
        // Get the first scan
        const scans = await client.query("scans:getScans", { limit: 1 });
        if (scans.length === 0) {
            console.log("No scans found");
            return;
        }

        const scan = scans[0];
        console.log(`Testing PDF parsing for scan: ${scan.name}`);
        console.log(`URL: ${scan.url}`);
        console.log(`Type: ${scan.documentType}`);

        // Trigger a new analysis
        console.log("Triggering new analysis...");
        await client.action("analysis_action:performDocumentAnalysis", {
            scanId: scan._id
        });

        console.log("Analysis triggered successfully!");
        console.log("Check the analysis results in a few moments...");

    } catch (error) {
        console.error("Error:", error);
    }
}

testPdfParsing();