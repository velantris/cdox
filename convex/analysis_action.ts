"use node";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { extractText as extractPdfText } from "unpdf";
import { z } from "zod";
import { makePrompt } from "../lib/prompts/prompt-maker";
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
        const { text } = await extractPdfText(new Uint8Array(bytes), { mergePages: true });
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
            } catch (_) {
                console.error(`Bad regex in rule ${rule.name}`);
            }
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
    const schema = z.object({
        summary: z.string(),
        recommendations: z.array(z.object({
            heading: z.string(),
            points: z.array(z.string()),
            priority: z.union([
                z.literal("high"),
                z.literal("medium"),
                z.literal("low"),
            ]),
        })),
        score: z.number(),
        issues: z.array(
            z.object({
                // offset_start: z.number(),
                // offset_end: z.number(),
                offset_start: z.number().optional(),
                offset_end: z.number().optional(),
                original_text: z.string().max(300),
                issue_explanation: z.string(),
                suggested_rewrite: z.string(),
                grading: z.string(),
                issue_type: z.string(),
                section_category: z.string(),
                score: z.number().optional(),
            })
        ),
    });
    let object;
    try {
        ({ object } = await generateObject({
            // model: anthropic("claude-sonnet-4-20250514"),
            model: openai("gpt-4o"),
            prompt,
            schema,
        }));
        console.log("Claude success", object);
    } catch (claudeError) {
        try {
            ({ object } = await generateObject({
                model: openai("gpt-4o-mini"),
                prompt,
                schema,
            }));
            console.log("OpenAI success", object);
        } catch (openaiError) {
            try {
                ({ object } = await generateObject({
                    model: google("gemini-2.5-flash"),
                    prompt,
                    schema,
                }));
                console.log("Google success", object);
            } catch (googleError) {
                throw new Error("Failed to parse analysis response from both models");
            }
        }
    }
    return object;
}

// ----------------------------------------------------------------------------
// Main Convex Action
// ----------------------------------------------------------------------------
export const performDocumentAnalysis = action({
    args: {
        scanId: v.id("scans"),
        customRuleIds: v.optional(v.array(v.id("customRules"))),
    },
    handler: async (ctx, { scanId, customRuleIds }) => {
        // --------------------------------------------------------------------
        // 1. Fetch scan & create analysis shell
        // --------------------------------------------------------------------
        const scan = await ctx.runQuery(api.scans.getScan, { id: scanId });
        if (!scan) throw new Error("Scan not found");

        const analysisId = await ctx.runMutation(api.analysis.createAnalysis, {
            scanId,
            customRuleIds,
        });

        try {
            // ------------------------------------------------------------------
            // 2. Read & extract text
            // ------------------------------------------------------------------
            const { bytes, contentType, fileName } = await readDocumentBytes(ctx, scan);
            const documentText = await extractText(bytes, contentType, fileName);

            // ------------------------------------------------------------------
            // 3. Load active custom rules (if any)
            // ------------------------------------------------------------------
            let rules: any[] = [];
            if (customRuleIds?.length) {
                rules = (
                    await Promise.all(
                        customRuleIds.map((id) => ctx.runQuery(api.customRules.getCustomRule, { id }))
                    )
                ).filter((r) => r?.active);
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
                rules
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

            const allIssues = [...aiIssues, ...customIssues];
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
            // 6. Persist analysis & issues
            // ------------------------------------------------------------------
            await ctx.runMutation(api.analysis.updateAnalysisResults, {
                id: analysisId,
                summary: openAIRes.summary,
                recommendations: Array.from(new Set(openAIRes.recommendations))
                    .map((rec: any) => {
                        if (typeof rec === "string") {
                            return {
                                heading: rec,
                                points: [rec],
                                priority: "medium",
                            };
                        }
                        // Defensive: if points is not an array, wrap it
                        return {
                            heading: rec.heading,
                            points: Array.isArray(rec.points) ? rec.points : [String(rec.points)],
                            priority: rec.priority || "medium",
                        };
                    }),
                score: Math.round(openAIRes.score),
                status: "completed",
                providerRaw: { openai: openAIRes },
                customRuleIds: customRuleIds,
                documentText: documentText,
            });

            if (dbIssues.length) {
                await ctx.runMutation(api.issues.createIssues, { analysisId, issues: dbIssues });
            }
        } catch (err) {
            await ctx.runMutation(api.analysis.updateAnalysisError, {
                id: analysisId,
                error: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    },
});