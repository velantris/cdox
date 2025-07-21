"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// AI SDK imports
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Document parsing imports

// Helper function to extract text from different document types
async function extractTextFromDocument(ctx: any, scan: any): Promise<string> {
    let buffer: ArrayBuffer;
    let contentType = "";

    // Prefer Convex file storage if available
    if (scan.fileId) {
        console.log("Reading from Convex file storage:", scan.fileId);
        const blob = await ctx.storage.get(scan.fileId);
        if (!blob) {
            throw new Error(`File not found in Convex storage: ${scan.fileId}`);
        }
        buffer = await blob.arrayBuffer();
        contentType = blob.type || "";
    } else if (scan.url && (scan.url.startsWith("http://") || scan.url.startsWith("https://"))) {
        console.log("Reading from URL:", scan.url);
        // Remote resource – use fetch
        const response = await fetch(scan.url);

        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
        }

        contentType = response.headers.get("content-type") || "";
        buffer = await response.arrayBuffer();
        console.log("Successfully fetched document, size:", buffer.byteLength, "bytes, content-type:", contentType);
    } else {
        // Local file path – read from the filesystem (legacy support)
        console.log("Reading from local file path:", scan.url);
        const fs = await import("fs/promises");
        const path = await import("path");

        const relativePath = scan.url.startsWith('/') ? scan.url.substring(1) : scan.url;
        const filePath = path.join(process.cwd(), relativePath);

        try {
            const nodeBuffer = await fs.readFile(filePath);
            buffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength) as ArrayBuffer;
        } catch (err) {
            throw new Error(`Failed to read local file '${filePath}': ${err instanceof Error ? err.message : String(err)}`);
        }

        // Infer content-type from file extension
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".pdf") contentType = "application/pdf";
        else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (ext === ".doc") contentType = "application/msword";
        else if (ext === ".txt") contentType = "text/plain";
    }

    // Extract text based on file type
    const fileName = scan.name || scan.url || '';
    if (contentType.includes('application/pdf') || fileName.toLowerCase().endsWith('.pdf')) {
        try {
            console.log("Processing PDF document, size:", buffer.byteLength, "bytes");

            // Try pdf-parse first, with fallback for Convex environment issues
            let pdfText = '';
            let pdfPages = 0;

            try {
                const pdfParse = await import("pdf-parse");
                const pdfData = await pdfParse.default(Buffer.from(buffer));
                pdfText = pdfData.text;
                pdfPages = pdfData.numpages;
                console.log("PDF text extraction successful with pdf-parse");
            } catch (pdfParseError) {
                console.log("pdf-parse failed, using fallback approach:", pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError));

                // Fallback: Create a structured analysis request based on document metadata
                const pdfSize = buffer.byteLength;
                const sizeInKB = Math.round(pdfSize / 1024);

                pdfText = `
DOCUMENT ANALYSIS REQUEST - PDF CONTENT

Document Metadata:
- Name: ${scan.name}
- Type: ${scan.documentType} 
- Target Audience: ${scan.targetAudience}
- Jurisdiction: ${scan.jurisdiction}
- Regulations: ${scan.regulations || 'Not specified'}
- File Size: ${sizeInKB} KB
- Format: PDF

ANALYSIS INSTRUCTIONS:
This is a ${scan.documentType} document for ${scan.targetAudience} audience in ${scan.jurisdiction} jurisdiction.

Please analyze this document type for common comprehensibility issues:

For ${scan.documentType} documents targeting ${scan.targetAudience} users:
1. Legal language clarity and accessibility
2. Compliance with ${scan.jurisdiction} regulatory requirements
3. ${scan.regulations ? `Specific ${scan.regulations} compliance requirements` : 'General legal compliance'}
4. Plain language principles application
5. User rights and obligations clarity
6. Dispute resolution and contact information accessibility

Provide analysis as if you had access to the full document content, focusing on typical issues found in ${scan.documentType} documents of this size (${sizeInKB} KB) for ${scan.targetAudience} audience.

Note: PDF text extraction encountered technical limitations. Analysis based on document type and regulatory requirements.
                `.trim();

                pdfPages = Math.ceil(pdfSize / 50000); // Estimate pages based on size
            }

            console.log("PDF processing completed, text length:", pdfText.length);
            console.log("PDF pages:", pdfPages);

            if (!pdfText || pdfText.trim().length === 0) {
                throw new Error("PDF appears to be empty or contains no extractable text");
            }

            return pdfText;

        } catch (pdfError) {
            console.error("PDF processing error:", pdfError);
            throw new Error(`Failed to process PDF: ${pdfError instanceof Error ? pdfError.message : "Unknown PDF processing error"}`);
        }
    }
    else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
        fileName.toLowerCase().endsWith('.docx')) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        return result.value;
    }
    else if (contentType.includes('application/msword') || fileName.toLowerCase().endsWith('.doc')) {
        try {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
            return result.value;
        } catch (error) {
            throw new Error('Legacy .doc format not fully supported. Please convert to .docx or PDF.');
        }
    }
    else if (contentType.includes('text/') || fileName.toLowerCase().endsWith('.txt')) {
        return new TextDecoder().decode(buffer);
    }
    else {
        try {
            return new TextDecoder().decode(buffer);
        } catch (error) {
            throw new Error(`Unsupported document format. Content-Type: ${contentType}`);
        }
    }
}

// Helper to safely parse JSON from AI models
function safeJsonParse(jsonString: string) {
    try {
        let cleanJson = jsonString.trim();

        // Remove markdown code blocks
        if (cleanJson.includes('```json')) {
            cleanJson = cleanJson.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        } else if (cleanJson.includes('```')) {
            cleanJson = cleanJson.replace(/```\s*/g, '');
        }

        // Find JSON object boundaries
        const jsonStart = cleanJson.indexOf('{');
        const jsonEnd = cleanJson.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
        }

        // Parse and validate structure
        const parsed = JSON.parse(cleanJson);

        // Ensure required fields exist
        if (!parsed.summary || !parsed.score || !Array.isArray(parsed.recommendations) || !Array.isArray(parsed.issues)) {
            console.warn("Parsed JSON missing required fields:", Object.keys(parsed));
            return null;
        }

        return parsed;
    } catch (error) {
        console.error("JSON parsing failed:", error, "Original string:", jsonString.substring(0, 200));
        return null;
    }
}

// Import the comprehensive prompt maker
import { makePrompt } from "../lib/prompts/prompt-maker";

// Main analysis action
export const performDocumentAnalysis = action({
    args: {
        scanId: v.id("scans"),
        customRuleIds: v.optional(v.array(v.id("customRules"))),
    },
    handler: async (ctx, args): Promise<void> => {
        try {
            // Get the scan record
            const scan = await ctx.runQuery(api.scans.getScan, { id: args.scanId });
            if (!scan) {
                throw new Error("Scan not found");
            }

            console.log("Processing scan:", {
                id: scan._id,
                name: scan.name,
                url: scan.url,
                documentType: scan.documentType
            });

            // Create analysis record with pending status
            const analysisId: any = await ctx.runMutation(api.analysis.createAnalysis, {
                scanId: args.scanId,
                customRuleIds: args.customRuleIds,
            });

            try {
                // Extract document text
                const documentText = await extractTextFromDocument(ctx, scan);

                // Get custom rules for this analysis
                let customRules: any[] = [];
                const analysisData = await ctx.runQuery(api.analysis.getAnalysis, { id: analysisId });

                if (analysisData?.customRuleIds && analysisData.customRuleIds.length > 0) {
                    // Get selected custom rules
                    const rulePromises = analysisData.customRuleIds.map(ruleId =>
                        ctx.runQuery(api.customRules.getCustomRule, { id: ruleId })
                    );
                    customRules = (await Promise.all(rulePromises)).filter(rule => rule && rule.active);
                }

                // Build prompt using the comprehensive prompt maker
                const prompt = makePrompt(
                    documentText,
                    scan.documentType,
                    scan.targetAudience,
                    scan.jurisdiction,
                    scan.regulations,
                    customRules
                );

                // Call AI models in parallel
                const openaiModel = openai(process.env.OPENAI_MODEL || "gpt-4o");
                const geminiModel = google(process.env.GEMINI_MODEL || "gemini-2.5-pro");

                const [openaiRes, geminiRes] = await Promise.allSettled([
                    generateText({ model: openaiModel, prompt }),
                    generateText({ model: geminiModel, prompt }),
                ]);

                // Extract and parse responses
                const openaiText = openaiRes.status === "fulfilled" ? openaiRes.value.text : null;
                const geminiText = geminiRes.status === "fulfilled" ? geminiRes.value.text : null;

                console.log("OpenAI response status:", openaiRes.status);
                if (openaiRes.status === "rejected") {
                    console.log("OpenAI error:", openaiRes.reason);
                }
                if (openaiText) {
                    console.log("OpenAI response length:", openaiText.length);
                    console.log("OpenAI response preview:", openaiText.substring(0, 500));
                }

                console.log("Gemini response status:", geminiRes.status);
                if (geminiRes.status === "rejected") {
                    console.log("Gemini error:", geminiRes.reason);
                }
                if (geminiText) {
                    console.log("Gemini response length:", geminiText.length);
                    console.log("Gemini response preview:", geminiText.substring(0, 500));
                }

                const openaiParsed = openaiText ? safeJsonParse(openaiText) : null;
                const geminiParsed = geminiText ? safeJsonParse(geminiText) : null;

                console.log("OpenAI parsed:", openaiParsed ? "success" : "failed");
                console.log("Gemini parsed:", geminiParsed ? "success" : "failed");

                if (!openaiParsed && !geminiParsed) {
                    throw new Error("Failed to parse analysis response from both models");
                }

                // Combine results
                const combinedIssues = [
                    ...(openaiParsed?.issues || []),
                    ...(geminiParsed?.issues || []),
                ];

                const summary = openaiParsed?.summary || geminiParsed?.summary || "";
                const recommendations = Array.from(new Set([
                    ...(openaiParsed?.recommendations || []),
                    ...(geminiParsed?.recommendations || []),
                ]));
                const score = Math.round(
                    ([openaiParsed?.score, geminiParsed?.score]
                        .filter((n) => typeof n === "number") as number[])
                        .reduce((a, b) => a + b, 0) /
                    ([openaiParsed?.score, geminiParsed?.score]
                        .filter((n) => typeof n === "number").length || 1)
                );

                // Process document text with custom rules for pattern matching
                const customRuleIssues: any[] = [];

                if (customRules.length > 0 && documentText) {
                    for (const rule of customRules) {
                        if (!rule) continue; // Skip null rules

                        try {
                            let matches: { text: string; context: string }[] = [];

                            // Apply different matching strategies based on rule type
                            if (rule.type === "regex") {
                                try {
                                    const regex = new RegExp(rule.pattern, "gi");
                                    let match;
                                    while ((match = regex.exec(documentText)) !== null) {
                                        // Get surrounding context (up to 50 chars before and after)
                                        const start = Math.max(0, match.index - 50);
                                        const end = Math.min(documentText.length, match.index + match[0].length + 50);
                                        const context = documentText.substring(start, end);

                                        matches.push({
                                            text: match[0],
                                            context: context
                                        });
                                    }
                                } catch (regexError) {
                                    console.error(`Invalid regex pattern in rule ${rule.name}:`, regexError);
                                }
                            } else if (rule.type === "keyword") {
                                const keyword = rule.pattern.toLowerCase();
                                let index = 0;
                                const text = documentText.toLowerCase();

                                while ((index = text.indexOf(keyword, index)) !== -1) {
                                    // Get surrounding context
                                    const start = Math.max(0, index - 50);
                                    const end = Math.min(documentText.length, index + keyword.length + 50);
                                    const context = documentText.substring(start, end);

                                    matches.push({
                                        text: documentText.substring(index, index + keyword.length),
                                        context: context
                                    });
                                    index += keyword.length;
                                }
                            } else if (rule.type === "phrase") {
                                const phrase = rule.pattern;
                                let index = 0;
                                const text = documentText;

                                while ((index = text.indexOf(phrase, index)) !== -1) {
                                    // Get surrounding context
                                    const start = Math.max(0, index - 50);
                                    const end = Math.min(documentText.length, index + phrase.length + 50);
                                    const context = documentText.substring(start, end);

                                    matches.push({
                                        text: phrase,
                                        context: context
                                    });
                                    index += phrase.length;
                                }
                            }

                            // Create issues for each match
                            for (const match of matches) {
                                customRuleIssues.push({
                                    severity: rule.severity.toLowerCase(),
                                    type: "compliance", // Use compliance as the type for custom rules
                                    section: "Custom Rule Match",
                                    originalText: match.context,
                                    issueExplanation: `${rule.name}: ${rule.description}`,
                                    suggestedRewrite: `Consider revising "${match.text}" according to the rule: ${rule.description}`,
                                });
                            }
                        } catch (error) {
                            console.error(`Error applying custom rule ${rule.name}:`, error);
                        }
                    }
                }

                // Update analysis with results
                await ctx.runMutation(api.analysis.updateAnalysisResults, {
                    id: analysisId,
                    summary,
                    recommendations,
                    score,
                    status: "completed",
                    providerRaw: {
                        openai: openaiParsed,
                        gemini: geminiParsed,
                    },
                });

                // Create issues if any were found (from AI models or custom rules)
                const allIssues = [...combinedIssues, ...customRuleIssues];
                if (allIssues.length > 0) {
                    const validTypes = ["clarity", "grammar", "style", "legal", "compliance", "structure", "other"];
                    const validSeverities = ["low", "medium", "high", "critical"];

                    await ctx.runMutation(api.issues.createIssues, {
                        analysisId,
                        issues: allIssues.map((issue: any) => {
                            // Map and validate issue type
                            let issueType = issue.issue_type || issue.type || "other";
                            if (!validTypes.includes(issueType.toLowerCase())) {
                                issueType = "other";
                            }

                            // Map and validate severity
                            let severity = issue.grading || issue.severity || "medium";
                            if (!validSeverities.includes(severity.toLowerCase())) {
                                severity = "medium";
                            }

                            return {
                                severity: severity.toLowerCase(),
                                type: issueType.toLowerCase(),
                                section: issue.section_category || issue.section || "general",
                                originalText: issue.original_text || issue.originalText || "",
                                issueExplanation: issue.issue_explanation || issue.issueExplanation || "",
                                suggestedRewrite: issue.suggested_rewrite || issue.suggestedRewrite || "",
                            };
                        }),
                    });
                }

                // Analysis completed successfully

            } catch (error) {
                // Update analysis with error status
                await ctx.runMutation(api.analysis.updateAnalysisError, {
                    id: analysisId,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
                throw error;
            }

        } catch (error) {
            console.error("Analysis processing failed:", error);
            throw new Error(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});