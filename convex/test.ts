import { query } from "./_generated/server";

// Simple test query to verify Convex setup
export const testConnection = query({
  args: {},
  handler: async (ctx) => {
    // Test that we can access the database
    const scanCount = await ctx.db.query("scans").collect().then(scans => scans.length);
    const analysisCount = await ctx.db.query("analysis").collect().then(analysis => analysis.length);
    const issueCount = await ctx.db.query("issues").collect().then(issues => issues.length);
    
    return {
      message: "Convex backend is properly configured!",
      tables: {
        scans: scanCount,
        analysis: analysisCount,
        issues: issueCount
      },
      timestamp: Date.now()
    };
  },
});