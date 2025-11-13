"use node";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { extractText as extractPdfText } from "unpdf";
import { z } from "zod";
import { analyzeLanguageComplexity } from "../lib/language-complexity-analyzer";
import { makePrompt } from "../lib/prompts/prompt-maker1";
import { validatePdfStructure } from "../lib/pdf-structure-validator";
import {
    DEFAULT_SCORING_CONFIG,
    calculateScore as calculateWeightedScore,
    combineAiAndIssueScores,
    getScoreInterpretation as interpretScore,
} from "../lib/scoring-service";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Read a document from Convex storage, a remote URL, or the local filesystem.
 * Returns the bytes and best-guess content-type.
 */
async function readDocumentBytes(
    ctx: any,
    scan: any
): Promise<{ bytes: ArrayBuffer; contentType: string; fileName: string }> {
    let bytes: ArrayBuffer;
    let contentType = "";
    let fileName = scan.name || scan.url || "";

    // 1. Convex storage
    if (scan.fileId) {
        const blob = await ctx.storage.get(scan.fileId);
        if (!blob) throw new Error(`File not found: ${scan.fileId}`);
        bytes = await blob.arrayBuffer();
        contentType = blob.type || "";
        return { bytes, contentType, fileName };
    }

    // 2. Remote URL
    if (scan.url?.startsWith("http")) {
        const response = await fetch(scan.url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        bytes = await response.arrayBuffer();
        contentType = response.headers.get("content-type") || "";
        return { bytes, contentType, fileName };
    }

    // 3. Local path (for tests / scripts)
    if (process.env.NODE_ENV !== "production") {
        const fs = await import("fs/promises");
        const path = await import("path");

        // Determine the absolute path of the file on the local filesystem.
        // 1. If the provided URL is already an absolute path (e.g. "/Users/me/file.pdf"),
        //    use it directly.
        // 2. Otherwise, treat it as a path **relative to the project root** (process.cwd()).
        //    This preserves the previous behaviour for tests that reference paths like
        //    "test/data/sample.pdf" while avoiding the accidental truncation of the leading
        //    slash on absolute paths that caused ENOENT errors.
        const full = path.isAbsolute(scan.url)
            ? scan.url
            : path.resolve(process.cwd(), scan.url);
        try {
            const nodeBuf = await fs.readFile(full);
            bytes = nodeBuf.buffer.slice(
                nodeBuf.byteOffset,
                nodeBuf.byteOffset + nodeBuf.byteLength
            ) as ArrayBuffer;
        } catch (err) {
            throw new Error(`Local file not found: ${full}`);
        }
        const ext = path.extname(full).toLowerCase();
        const extToType: Record<string, string> = {
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".txt": "text/plain",
        };
        contentType = extToType[ext] ?? "";
        return { bytes, contentType, fileName };
    }

    throw new Error("Local file paths are not supported in this environment. Please upload your document or provide a reachable URL.");
}

/** Extract raw text from bytes based on content-type / file extension. */
async function extractText(
    bytes: ArrayBuffer,
    contentType: string,
    fileName: string
): Promise<string> {
    if (contentType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
        // Clone the byte buffer before passing it to unpdf; it transfers (detaches) the ArrayBuffer it receives.
        const clonedBytes = new Uint8Array(bytes).slice();
        const { text } = await extractPdfText(clonedBytes, { mergePages: true });
        if (!text.trim()) {
            // @ts-ignore: missing types for tesseract.js
            const { createWorker } = await import("tesseract.js");
            const worker: any = await createWorker();
            await worker.load();
            await worker.loadLanguage("eng");
            await worker.initialize("eng");
            const { data: { text: ocrText } } = await worker.recognize(new Uint8Array(bytes));
            await worker.terminate();
            return ocrText;
        }
        return text;
    }

    if (
        contentType.includes("openxmlformats") ||
        fileName.toLowerCase().endsWith(".docx") ||
        contentType.includes("msword") ||
        fileName.toLowerCase().endsWith(".doc")
    ) {
        const mammoth = await import("mammoth");
        const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
        return value;
    }

    // Fallback to plain text
    return new TextDecoder().decode(bytes);
}

/**
 * Match custom rules against a document, producing issue objects compatible
 * with the issues.createIssues mutation.
 */
function matchCustomRules(doc: string, rules: any[]) {
    const issues: any[] = [];
    for (const rule of rules) {
        if (!rule?.active) continue;
        const pushIssue = (text: string, ctx: string) =>
            issues.push({
                severity: (rule.severity || "medium").toLowerCase(),
                type: "compliance",
                section: "Custom Rule Match",
                originalText: ctx,
                issueExplanation: `${rule.name}: ${rule.description}`,
                suggestedRewrite: `Consider revising "${text}"`,
                offsetStart: undefined,
                offsetEnd: undefined,
            });

        const raw = rule.pattern;
        if (rule.type === "regex") {
            try {
                const re = new RegExp(raw, "gi");
                for (let m; (m = re.exec(doc));) {
                    const start = Math.max(0, m.index - 50);
                    const end = Math.min(doc.length, m.index + m[0].length + 50);
                    issues.push({
                        severity: (rule.severity || "medium").toLowerCase(),
                        type: "compliance",
                        section: "Custom Rule Match",
                        originalText: doc.slice(start, end),
                        issueExplanation: `${rule.name}: ${rule.description}`,
                        suggestedRewrite: `Consider revising "${m[0]}"`,
                        offsetStart: m.index,
                        offsetEnd: m.index + m[0].length,
                    });
                }
            } catch (_) { }
            continue;
        }

        // keyword / phrase – simple substring search (case-insensitive for keyword)
        const needle = rule.type === "keyword" ? raw.toLowerCase() : raw;
        const haystack = rule.type === "keyword" ? doc.toLowerCase() : doc;
        let idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) !== -1) {
            const start = Math.max(0, idx - 50);
            const end = Math.min(doc.length, idx + raw.length + 50);
            issues.push({
                severity: (rule.severity || "medium").toLowerCase(),
                type: "compliance",
                section: "Custom Rule Match",
                originalText: doc.slice(start, end),
                issueExplanation: `${rule.name}: ${rule.description}`,
                suggestedRewrite: `Consider revising "${doc.slice(idx, idx + raw.length)}"`,
                offsetStart: idx,
                offsetEnd: idx + raw.length,
            });
            idx += raw.length;
        }
    }
    return issues;
}

/** Run OpenAI analysis and validate structure with zod. */
async function analyseWithOpenAI(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const schema = z.object({
        summary: z.string().default("Analysis completed"),
        recommendations: z.preprocess(
            (val) => Array.isArray(val) ? val : [],
            z.array(z.object({
                heading: z.string(),
                points: z.array(z.string()),
                priority: z.union([
                    z.literal("high"),
                    z.literal("medium"),
                    z.literal("low"),
                ]).default("medium"),
                category: z.string().optional(),
                impact_score: z.number().optional(),
                implementation_effort: z.union([
                    z.literal("low"),
                    z.literal("medium"),
                    z.literal("high"),
                ]).optional(),
            }).passthrough())
        ).default([]),
        score: z.number().min(0).max(100).default(50),
        readability_metrics: z.object({
            flesch_kincaid_grade: z.number().optional(),
            avg_sentence_length: z.number().optional(),
            complex_words_percentage: z.number().optional(),
            passive_voice_percentage: z.number().optional(),
        }).optional(),
        issues: z.preprocess(
            (val) => Array.isArray(val) ? val : [],
            z.array(
                z.object({
                    offset_start: z.number().optional(),
                    offset_end: z.number().optional(),
                    original_text: z.preprocess(
                        (val) => typeof val === "string" ? val.slice(0, 300) : val,
                        z.string().max(300)
                    ).default(""),
                    issue_explanation: z.string().default(""),
                    suggested_rewrite: z.string().default(""),
                    grading: z.string().default("medium"),
                    issue_type: z.string().default("other"),
                    section_category: z.string().default("general"),
                    score: z.number().optional(),
                    reading_level_impact: z.string().optional(),
                    accessibility_impact: z.string().optional(),
                    compliance_risk: z.string().optional(),
                }).passthrough()
            )
        ).default([]),
        accessibility_assessment: z.object({
            wcag_compliance_level: z.union([
                z.literal("AA"),
                z.literal("A"),
                z.literal("Non-compliant"),
            ]).optional(),
            screen_reader_compatibility: z.union([
                z.literal("high"),
                z.literal("medium"),
                z.literal("low"),
            ]).optional(),
            cognitive_accessibility: z.union([
                z.literal("high"),
                z.literal("medium"),
                z.literal("low"),
            ]).optional(),
            multilingual_considerations: z.string().optional(),
        }).optional(),
        compliance_status: z.object({
            regulatory_alignment: z.union([
                z.literal("full"),
                z.literal("partial"),
                z.literal("non-compliant"),
            ]).optional(),
            transparency_score: z.number().optional(),
            legal_risk_areas: z.array(z.string()).optional(),
            improvement_priority: z.union([
                z.literal("high"),
                z.literal("medium"),
                z.literal("low"),
            ]).optional(),
        }).optional(),
    });

    let object;
    let lastError: Error | null = null;

    // Ensure API key is set in process.env (it should be from Convex env vars)
    // @ai-sdk/openai reads from process.env.OPENAI_API_KEY automatically
    process.env.OPENAI_API_KEY = apiKey;

    // Try OpenAI GPT-5 first
    // Note: GPT-5 models only support temperature: 1 (default), not 0
    try {
        ({ object } = await generateObject({
            model: openai("gpt-5"),
            prompt,
            schema,
            temperature: 1, // GPT-5 requires temperature: 1, cannot be 0
            maxRetries: 2,
        }));
        return object;
    } catch (openaiError) {
        let errorInstance = openaiError instanceof Error ? openaiError : new Error(String(openaiError));
        if (openaiError && typeof openaiError === "object") {
            const details: string[] = [];
            if ("value" in openaiError) {
                try {
                    details.push(`value=${JSON.stringify((openaiError as any).value).slice(0, 500)}`);
                } catch {
                    details.push("value=[unserializable]");
                }
            }
            if ("errors" in openaiError) {
                try {
                    details.push(`validation=${JSON.stringify((openaiError as any).errors).slice(0, 500)}`);
                } catch {
                    details.push("validation=[unserializable]");
                }
            }
            if (details.length) {
                errorInstance = new Error(`${errorInstance.message} | ${details.join(" | ")}`);
            }
        }
        lastError = errorInstance;
    }

    // Try OpenAI GPT-5-mini as fallback
    // Note: GPT-5-mini models only support temperature: 1 (default), not 0
    try {
        ({ object } = await generateObject({
            model: openai("gpt-5-mini"),
            prompt,
            schema,
            temperature: 1, // GPT-5-mini requires temperature: 1, cannot be 0
            maxRetries: 2,
        }));
        return object;
    } catch (openaiMiniError) {
        lastError =
            openaiMiniError instanceof Error ? openaiMiniError : new Error(String(openaiMiniError));
    }

    // Try OpenAI GPT-4o as fallback (supports temperature: 0)
    try {
        ({ object } = await generateObject({
            model: openai("gpt-4o"),
            prompt,
            schema,
            temperature: 0, // GPT-4o supports temperature: 0 for deterministic output
            maxRetries: 2,
        }));
        return object;
    } catch (gpt4oError) {
        lastError = gpt4oError instanceof Error ? gpt4oError : new Error(String(gpt4oError));
    }

    // If all models fail, surface the underlying error (if any)
    if (lastError) {
        throw lastError;
    }
    throw new Error("All AI models failed with no additional error details. Check provider credentials and network connectivity.");
}

// ----------------------------------------------------------------------------
// Main Convex Action
// ----------------------------------------------------------------------------
export const performDocumentAnalysis = action({
    args: {
        scanId: v.id("scans"),
        customRuleIds: v.optional(v.array(v.id("customRules"))),
        scoringConfigId: v.optional(v.id("scoringConfigs")),
    },
    handler: async (ctx, { scanId, customRuleIds, scoringConfigId }) => {
        // --------------------------------------------------------------------
        // 1. Fetch scan & create analysis shell
        // --------------------------------------------------------------------
        const scan = await ctx.runQuery(api.scans.getScan, { id: scanId });
        if (!scan) throw new Error("Scan not found");

        const analysisId = await ctx.runMutation(api.analysis.createAnalysis, {
            scanId,
            customRuleIds,
            scoringConfigId,
        });

        try {
            // ------------------------------------------------------------------
            // 2. Read & extract text
            // ------------------------------------------------------------------
            const { bytes, contentType, fileName } = await readDocumentBytes(ctx, scan);
            const documentText = await extractText(bytes, contentType, fileName);
            const isPdfDocument =
                contentType.toLowerCase().includes("pdf") ||
                fileName.toLowerCase().endsWith(".pdf");
            const pdfStructureCompliance = isPdfDocument
                ? await validatePdfStructure(bytes)
                : undefined;

            const languageComplexity = analyzeLanguageComplexity(documentText, scan.language);

            // ------------------------------------------------------------------
            // 3. Load active custom rules (if any)
            // ------------------------------------------------------------------
            let rules: any[] = [];
            if (customRuleIds?.length) {
                rules = (
                    await Promise.all(
                        customRuleIds.map((id) => ctx.runQuery(api.customRules.getCustomRule, { id }))
                    )
                ).filter((r: any) => r?.active);
            }

            // ------------------------------------------------------------------
            // 4. Build prompt & run OpenAI
            // ------------------------------------------------------------------
            const prompt = makePrompt(
                documentText,
                scan.documentType,
                scan.targetAudience,
                scan.jurisdiction,
                scan.regulations,
                scan.language || "english",
                rules,
                languageComplexity
            );

            const openAIRes = await analyseWithOpenAI(prompt);

            // ------------------------------------------------------------------
            // 5. Transform AI issues (+ include custom rule issues)
            // ------------------------------------------------------------------
            const aiIssues = (openAIRes.issues || []).map((iss: any) => {
                let offsetStart = typeof iss.offset_start === "number" ? iss.offset_start : undefined;
                let offsetEnd = typeof iss.offset_end === "number" ? iss.offset_end : undefined;

                let originalText = iss.original_text;
                if ((!originalText || !originalText.length) && offsetStart !== undefined && offsetEnd !== undefined && offsetEnd > offsetStart && offsetEnd <= documentText.length) {
                    originalText = documentText.slice(offsetStart, offsetEnd);
                }

                if (originalText && (!offsetStart || !offsetEnd)) {
                    const idx = documentText.indexOf(originalText);
                    if (idx !== -1) {
                        offsetStart = idx;
                        offsetEnd = idx + originalText.length;
                    }
                }

                return {
                    ...iss,
                    original_text: originalText,
                    offsetStart,
                    offsetEnd,
                };
            });

            const customIssues = matchCustomRules(documentText, rules);
            const structuralIssues = (pdfStructureCompliance?.structure_issues ?? []).map((issue) => ({
                severity: issue.severity,
                type: "structure",
                section: "PDF Structure Compliance",
                originalText: issue.context ?? issue.message,
                issueExplanation: `${issue.code}: ${issue.message}`,
                suggestedRewrite: "Update the PDF structure to meet compliance requirements.",
                offsetStart: undefined,
                offsetEnd: undefined,
            }));

            const allIssues = [...aiIssues, ...customIssues, ...structuralIssues];
            const validTypes = [
                "clarity",
                "grammar",
                "style",
                "legal",
                "compliance",
                "structure",
                "other",
            ];
            const validSeverities = ["low", "medium", "high", "critical"];

            // Normalise issues for DB
            const dbIssues = allIssues.map((iss: any) => {
                const issueType = validTypes.includes((iss.issue_type || iss.type || "other").toLowerCase())
                    ? iss.issue_type || iss.type
                    : "other";
                const severity = validSeverities.includes((iss.grading || iss.severity || "medium").toLowerCase())
                    ? iss.grading || iss.severity
                    : "medium";
                return {
                    severity: severity.toLowerCase(),
                    type: issueType.toLowerCase(),
                    section: iss.section_category || iss.section || "general",
                    originalText: (iss.original_text || iss.originalText || "").slice(0, 5000),
                    issueExplanation: (iss.issue_explanation || iss.issueExplanation || "").slice(0, 2000),
                    suggestedRewrite: (iss.suggested_rewrite || iss.suggestedRewrite || "").slice(0, 5000),
                    offsetStart: iss.offsetStart,
                    offsetEnd: iss.offsetEnd,
                };
            });

            // ------------------------------------------------------------------
            // 6. Calculate Score (Hybrid Approach)
            // ------------------------------------------------------------------
            const scoringConfig =
                (scoringConfigId
                    ? await ctx.runQuery(api.scoringConfigs.getScoringConfig, {
                        id: scoringConfigId,
                    })
                    : await ctx.runQuery(api.scoringConfigs.getDefaultConfig, {})) ?? null;

            const resolvedConfig = scoringConfig ?? DEFAULT_SCORING_CONFIG;

            // Calculate issue-based score
            const issueBasedScore = calculateWeightedScore(dbIssues, resolvedConfig);

            // Use AI's score if provided, otherwise fall back to issue-based calculation
            // The AI's holistic assessment is often more accurate than pure issue counting
            const aiProvidedScore = typeof openAIRes.score === "number" &&
                openAIRes.score >= 0 &&
                openAIRes.score <= 100
                ? openAIRes.score
                : null;

            // Count issues by severity for diagnostics and scoring
            const issueCounts = {
                total: dbIssues.length,
                critical: dbIssues.filter(iss => iss.severity === "critical").length,
                high: dbIssues.filter(iss => iss.severity === "high").length,
                medium: dbIssues.filter(iss => iss.severity === "medium").length,
                low: dbIssues.filter(iss => iss.severity === "low").length,
                aiIssues: aiIssues.length,
                customIssues: customIssues.length,
                structuralIssues: structuralIssues.length,
            };

            const {
                finalScore,
                aiAdjustedScore,
                severityPenalty,
                aiWeight,
                issueWeight,
            } = combineAiAndIssueScores({
                aiScore: aiProvidedScore,
                issueScore: issueBasedScore,
                issueCounts: {
                    critical: issueCounts.critical,
                    high: issueCounts.high,
                    medium: issueCounts.medium,
                    low: issueCounts.low,
                },
            });

            const scoreBand = interpretScore(finalScore, resolvedConfig.thresholds);

            await ctx.runMutation(api.analysis.updateAnalysisResults, {
                id: analysisId,
                summary: openAIRes.summary,
                recommendations: Array.isArray(openAIRes.recommendations)
                    ? openAIRes.recommendations.map((rec: any) => {
                        if (typeof rec === "string") {
                            return rec;
                        }
                        // Defensive: if points is not an array, wrap it
                        return {
                            heading: rec.heading,
                            points: Array.isArray(rec.points) ? rec.points : [String(rec.points)],
                            priority: rec.priority || "medium",
                            category: rec.category,
                            impact_score: rec.impact_score,
                            implementation_effort: rec.implementation_effort,
                        };
                    })
                    : [],
                score: finalScore,
                status: "completed",
                providerRaw: {
                    openai: {
                        ...openAIRes,
                        readability_metrics: openAIRes.readability_metrics,
                        accessibility_assessment: openAIRes.accessibility_assessment,
                        compliance_status: openAIRes.compliance_status,
                        aiProvidedScore,
                        issueBasedScore,
                        finalScore,
                        scoreBand,
                        issueCounts,
                        aiAdjustedScore,
                        severityPenalty,
                        scoreWeights: {
                            ai: aiWeight,
                            issues: issueWeight,
                        },
                    },
                    language_complexity: languageComplexity,
                },
                readability_metrics: openAIRes.readability_metrics,
                accessibility_assessment: openAIRes.accessibility_assessment,
                compliance_status: openAIRes.compliance_status,
                customRuleIds: customRuleIds,
                scoringConfigId: scoringConfig?._id,
                documentText: documentText,
                language_complexity: languageComplexity,
                ...(pdfStructureCompliance
                    ? { pdf_structure_compliance: pdfStructureCompliance }
                    : {}),
            });

            if (dbIssues.length) {
                await ctx.runMutation(api.issues.createIssues, { analysisId, issues: dbIssues });
            }
        } catch (err) {
            // Even on error, calculate a score based on any issues we might have found
            // This ensures comprehensibility score is always non-zero and meaningful
            const scoringConfig =
                (scoringConfigId
                    ? await ctx.runQuery(api.scoringConfigs.getScoringConfig, {
                        id: scoringConfigId,
                    })
                    : await ctx.runQuery(api.scoringConfigs.getDefaultConfig, {})) ?? null;
            const resolvedConfig = scoringConfig ?? DEFAULT_SCORING_CONFIG;

            // Try to get any issues that were created before the error
            const existingIssues = await ctx.runQuery(api.issues.getIssuesByAnalysis, { analysisId });
            const fallbackScore = existingIssues && existingIssues.length > 0
                ? calculateWeightedScore(
                    existingIssues.map((iss: any) => ({
                        severity: iss.severity,
                        type: iss.type,
                    })),
                    resolvedConfig
                )
                : 50; // Default to 50 if no issues found

            await ctx.runMutation(api.analysis.updateAnalysisError, {
                id: analysisId,
                error: err instanceof Error ? err.message : String(err),
                score: fallbackScore,
            });
            throw err;
        }
    },
});
