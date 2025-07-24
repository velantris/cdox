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
    documentText: v.optional(v.string()),
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
      readability_metrics: undefined,
      accessibility_assessment: undefined,
      compliance_status: undefined,
      providerRaw: {
        openai: undefined,
        gemini: undefined,
      },
      customRuleIds: args.customRuleIds || [],
      createdAt: Date.now(),
      documentText: args.documentText || "",
    });
    return analysisId;
  },
});

// Mutation to update analysis with results
export const updateAnalysisResults = mutation({
  args: {
    id: v.id("analysis"),
    summary: v.string(),
    recommendations: v.array(v.union(
      v.string(),
      v.object({
        heading: v.string(),
        points: v.array(v.string()),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        category: v.optional(v.string()),
        impact_score: v.optional(v.number()),
        implementation_effort: v.optional(v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        )),
      })
    )),
    score: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    readability_metrics: v.optional(v.object({
      flesch_kincaid_grade: v.optional(v.number()),
      avg_sentence_length: v.optional(v.number()),
      complex_words_percentage: v.optional(v.number()),
      passive_voice_percentage: v.optional(v.number()),
    })),
    accessibility_assessment: v.optional(v.object({
      wcag_compliance_level: v.optional(v.union(
        v.literal("AA"),
        v.literal("A"),
        v.literal("Non-compliant"),
      )),
      screen_reader_compatibility: v.optional(v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
      )),
      cognitive_accessibility: v.optional(v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
      )),
      multilingual_considerations: v.optional(v.string()),
    })),
    compliance_status: v.optional(v.object({
      regulatory_alignment: v.optional(v.union(
        v.literal("full"),
        v.literal("partial"),
        v.literal("non-compliant"),
      )),
      transparency_score: v.optional(v.number()),
      legal_risk_areas: v.optional(v.array(v.string())),
      improvement_priority: v.optional(v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
      )),
    })),
    providerRaw: v.object({
      openai: v.optional(v.any()),
      gemini: v.optional(v.any()),
    }),
    customRuleIds: v.optional(v.array(v.id("customRules"))),
    documentText: v.optional(v.string()),
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

