import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scans: defineTable({
    name: v.string(),
    url: v.string(), // Keep for backward compatibility, but new scans will use fileId
    fileId: v.optional(v.id("_storage")), // Convex file storage ID
    language: v.string(),
    documentType: v.string(),
    targetAudience: v.string(),
    jurisdiction: v.string(),
    regulations: v.string(),
    createdAt: v.number(),
  }),

  analysis: defineTable({
    scanId: v.id("scans"),
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
    createdAt: v.number(),
  }).index("by_scan", ["scanId"]),

  issues: defineTable({
    analysisId: v.id("analysis"),
    severity: v.string(),
    type: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("inprogress"),
      v.literal("verified"),
      v.literal("closed"),
      v.literal("false_positive")
    ),
    section: v.string(),
    originalText: v.string(),
    issueExplanation: v.string(),
    suggestedRewrite: v.string(),
    createdAt: v.number(),
  }).index("by_analysis", ["analysisId"]),

  customRules: defineTable({
    name: v.string(),
    pattern: v.string(),
    type: v.union(
      v.literal("keyword"),
      v.literal("regex"),
      v.literal("phrase")
    ),
    label: v.string(),
    severity: v.union(
      v.literal("Critical"),
      v.literal("High"),
      v.literal("Medium"),
      v.literal("Low")
    ),
    description: v.string(),
    active: v.boolean(),
    created: v.string(),
    lastModified: v.string(),
  }),
});