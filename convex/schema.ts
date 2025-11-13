import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const pdfStructureIssueSchema = v.object({
  code: v.string(),
  message: v.string(),
  severity: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("critical")
  ),
  context: v.optional(v.string()),
});

const languageComplexitySchema = v.object({
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

const severityWeightsSchema = v.object({
  critical: v.number(),
  high: v.number(),
  medium: v.number(),
  low: v.number(),
});

const categoryWeightsSchema = v.object({
  clarity: v.number(),
  grammar: v.number(),
  style: v.number(),
  legal: v.number(),
  compliance: v.number(),
  structure: v.number(),
  accessibility: v.number(),
  security: v.number(),
  transparency: v.number(),
  other: v.number(),
});

const scoringThresholdsSchema = v.object({
  pass: v.number(),
  warning: v.number(),
  fail: v.number(),
});

export default defineSchema({
  scoringConfigs: defineTable({
    name: v.string(),
    isDefault: v.boolean(),
    severityWeights: severityWeightsSchema,
    categoryWeights: categoryWeightsSchema,
    thresholds: scoringThresholdsSchema,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_default", ["isDefault"])
    .index("by_name", ["name"]),

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
      language_complexity: v.optional(languageComplexitySchema),
      gemini: v.optional(v.any()),
    }),
    customRuleIds: v.optional(v.array(v.id("customRules"))),
    scoringConfigId: v.optional(v.id("scoringConfigs")),
    createdAt: v.number(),
    documentText: v.optional(v.string()),
    pdf_structure_compliance: v.optional(v.object({
      pdf_ua_compliance: v.object({
        compliant: v.boolean(),
        issues: v.array(pdfStructureIssueSchema),
      }),
      pdf_a_compliance: v.object({
        compliant: v.boolean(),
        version: v.optional(v.union(
          v.literal("PDF/A-1"),
          v.literal("PDF/A-2"),
          v.literal("PDF/A-3")
        )),
        issues: v.array(pdfStructureIssueSchema),
      }),
      structure_issues: v.array(pdfStructureIssueSchema),
    })),
    language_complexity: v.optional(languageComplexitySchema),
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