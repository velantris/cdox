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
    recommendations: v.array(v.union(
      v.string(),
      v.object({
        heading: v.string(),
        points: v.array(v.string()),
        priority: v.union(
          v.literal('high'),
          v.literal('medium'),
          v.literal('low')
        ),
        category: v.optional(v.string()),
        impact_score: v.optional(v.number()),
        implementation_effort: v.optional(v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
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
    createdAt: v.number(),
    documentText: v.optional(v.string()),
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
    // Character offsets of the issue text within the analysed document (inclusive start, exclusive end)
    offsetStart: v.optional(v.number()),
    offsetEnd: v.optional(v.number()),
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