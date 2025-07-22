// Script to test analysis for a single scan
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function testSingleAnalysis() {
    try {
        // Test with the second scan (mj) which had no previous analysis attempts
        const scanId = "jn79gnbxfbh6mxqhwvak8xtv7s7m22fs";

        console.log(`🚀 Starting analysis for scan ${scanId}...`);

        const result = await client.action("analysis_action:performDocumentAnalysis", { scanId });
        console.log(`✅ Analysis completed successfully:`, result);

    } catch (error) {
        console.error("❌ Analysis failed:", error.message);
        console.error("Full error:", error);
    }
}

testSingleAnalysis();