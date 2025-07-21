import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get analysis by scan ID
export const getAnalysisByScan = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analysis")
      .withIndex("by_scan", (q) => q.eq("scanId", args.scanId))
      .collect();
  },
});

// Query to get a specific analysis by ID
export const getAnalysis = query({
  args: { id: v.id("analysis") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutation to create a new analysis record (initially with pending status)
export const createAnalysis = mutation({
  args: {
    scanId: v.id("scans"),
    customRuleIds: v.optional(v.array(v.id("customRules"))),
  },
  handler: async (ctx, args) => {
    // Verify the scan exists
    const scan = await ctx.db.get(args.scanId);
    if (!scan) {
      throw new Error("Scan not found");
    }

    const analysisId = await ctx.db.insert("analysis", {
      scanId: args.scanId,
      summary: "",
      recommendations: [],
      score: 0,
      status: "pending" as const,
      providerRaw: {
        openai: undefined,
        gemini: undefined,
      },
      customRuleIds: args.customRuleIds || [],
      createdAt: Date.now(),
    });
    return analysisId;
  },
});

// Mutation to update analysis with results
export const updateAnalysisResults = mutation({
  args: {
    id: v.id("analysis"),
    summary: v.string(),
    recommendations: v.array(v.string()),
    score: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    providerRaw: v.object({
      openai: v.optional(v.any()),
      gemini: v.optional(v.any()),
    }),
    customRuleIds: v.optional(v.array(v.id("customRules"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Mutation to update analysis status only
export const updateAnalysisStatus = mutation({
  args: {
    id: v.id("analysis"),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// Mutation to update analysis with error information
export const updateAnalysisError = mutation({
  args: {
    id: v.id("analysis"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed" as const,
      summary: `Analysis failed: ${args.error}`,
    });
  },
});

