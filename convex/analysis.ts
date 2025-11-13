import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const languageComplexityValidator = v.object({
  cefrLevel: v.string(),
  b2ComplianceScore: v.number(),
  plainLanguageScore: v.number(),
  readabilityAdjusted: v.number(),
  fleschKincaidGrade: v.number(),
  vocabularyComplexity: v.object({
    totalWords: v.number(),
    uniqueWords: v.number(),
    lexicalDensity: v.number(),
    averageWordLength: v.number(),
    simpleWordPercentage: v.number(),
    advancedWordPercentage: v.number(),
    complexWordPercentage: v.number(),
    jargonCount: v.number(),
    jargonTerms: v.array(v.string()),
    advancedSample: v.array(v.string()),
  }),
  sentenceComplexity: v.object({
    sentenceCount: v.number(),
    averageSentenceLength: v.number(),
    complexSentencePercentage: v.number(),
    subordinateClauseDensity: v.number(),
    passiveVoicePercentage: v.number(),
    modalVerbPercentage: v.number(),
    conditionalSentencePercentage: v.number(),
  }),
  plainLanguageRecommendations: v.array(v.string()),
});

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
    scoringConfigId: v.optional(v.id("scoringConfigs")),
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
      score: 50, // Default to 50 instead of 0 - will be updated when analysis completes
      status: "pending" as const,
      readability_metrics: undefined,
      accessibility_assessment: undefined,
      compliance_status: undefined,
      providerRaw: {
        openai: undefined,
        language_complexity: undefined,
      },
      customRuleIds: args.customRuleIds || [],
      scoringConfigId: args.scoringConfigId,
      createdAt: Date.now(),
      documentText: args.documentText || "",
      language_complexity: undefined,
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
      language_complexity: v.optional(languageComplexityValidator),
    }),
    customRuleIds: v.optional(v.array(v.id("customRules"))),
    scoringConfigId: v.optional(v.id("scoringConfigs")),
    documentText: v.optional(v.string()),
    pdf_structure_compliance: v.optional(v.object({
      pdf_ua_compliance: v.object({
        compliant: v.boolean(),
        issues: v.array(v.object({
          code: v.string(),
          message: v.string(),
          severity: v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("critical"),
          ),
          context: v.optional(v.string()),
        })),
      }),
      pdf_a_compliance: v.object({
        compliant: v.boolean(),
        version: v.optional(v.union(
          v.literal("PDF/A-1"),
          v.literal("PDF/A-2"),
          v.literal("PDF/A-3"),
        )),
        issues: v.array(v.object({
          code: v.string(),
          message: v.string(),
          severity: v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high"),
            v.literal("critical"),
          ),
          context: v.optional(v.string()),
        })),
      }),
      structure_issues: v.array(v.object({
        code: v.string(),
        message: v.string(),
        severity: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high"),
          v.literal("critical"),
        ),
        context: v.optional(v.string()),
      })),
    })),
    language_complexity: v.optional(languageComplexityValidator),
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
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed" as const,
      summary: `Analysis failed: ${args.error}`,
      // Ensure score is always set - comprehensibility score is non-optional
      score: args.score ?? 50, // Default to 50 if not provided
    });
  },
});

