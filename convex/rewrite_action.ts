"use node";

import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// AI SDK imports
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Helper function to calculate text complexity score
function calculateComplexityScore(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (words.length === 0 || sentences.length === 0) return 50;

    const avgWordsPerSentence = words.length / sentences.length;
    const longWords = words.filter(word => word.length > 6).length;
    const longWordRatio = longWords / words.length;
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // Calculate complexity factors
    const sentenceComplexity = Math.min(avgWordsPerSentence * 3, 50);
    const wordComplexity = Math.min(longWordRatio * 100, 30);
    const lengthComplexity = Math.min((avgWordLength - 4) * 10, 20);

    const totalComplexity = sentenceComplexity + wordComplexity + lengthComplexity;

    // Convert to comprehensibility score (higher is better)
    return Math.max(10, Math.min(95, 100 - totalComplexity));
}

// Create rewrite prompt
function createRewritePrompt(
    text: string,
    documentType: string,
    targetAudience: string,
    jurisdiction: string,
    customRules?: any[]
): string {
    let customRulesSection = "";
    if (customRules && customRules.length > 0) {
        customRulesSection = `

CUSTOM RULES TO APPLY:
${customRules.map(rule => `- ${rule.name}: ${rule.description} (${rule.severity} priority)`).join('\n')}
`;
    }

    return `You are an expert legal document editor specializing in plain language rewriting. Your task is to rewrite the provided text to improve comprehensibility while maintaining legal accuracy.

DOCUMENT CONTEXT:
- Document Type: ${documentType}
- Target Audience: ${targetAudience}
- Jurisdiction: ${jurisdiction}

REWRITING GUIDELINES:
1. Use plain, clear language that ${targetAudience} can easily understand
2. Break down complex sentences into shorter, clearer ones
3. Replace legal jargon with everyday terms where possible
4. Maintain all legal meanings and requirements
5. Ensure compliance with ${jurisdiction} legal standards
6. Use active voice instead of passive voice when possible
7. Define technical terms when they must be used
8. Use bullet points or numbered lists for complex information
9. Ensure logical flow and organization${customRulesSection}

ORIGINAL TEXT:
${text}

Please rewrite this text following the guidelines above. Return only the improved text without any explanations or metadata.`;
}

export const performTextRewrite = action({
    args: {
        text: v.string(),
        documentType: v.optional(v.string()),
        targetAudience: v.optional(v.string()),
        jurisdiction: v.optional(v.string()),
        customRuleIds: v.optional(v.array(v.id("customRules"))),
        documentText: v.optional(v.string()), // <-- add this line
    },
    handler: async (ctx, args): Promise<{
        rewritten: string;
        originalScore: number;
        rewrittenScore: number;
    }> => {
        try {
            // Calculate original text score
            const originalScore = Math.round(calculateComplexityScore(args.text));

            // Get custom rules if provided
            let customRules: any[] = [];
            if (args.customRuleIds && args.customRuleIds.length > 0) {
                const rulePromises = args.customRuleIds.map(ruleId =>
                    ctx.runQuery(api.customRules.getCustomRule, { id: ruleId })
                );
                customRules = (await Promise.all(rulePromises)).filter((rule: Doc<"customRules"> | null): rule is Doc<"customRules"> => rule !== null && rule.active);
            }

            // Use documentText if provided, otherwise fallback to text
            const contextText = args.documentText || args.text;

            // Create rewrite prompt
            const prompt = createRewritePrompt(
                args.text,
                args.documentType || "legal document",
                args.targetAudience || "general public",
                args.jurisdiction || "general",
                customRules
            );

            // Use OpenAI for rewrite
            const openaiModel = openai(process.env.OPENAI_MODEL || "gpt-4o");

            let rewrittenText = "";

            try {
                console.log("Attempting rewrite with OpenAI...");
                const openaiResult = await generateText({
                    model: openaiModel,
                    prompt
                });
                rewrittenText = openaiResult.text.trim();
                console.log("OpenAI rewrite successful");
            } catch (openaiError) {
                console.error("OpenAI rewrite failed:", openaiError);
                throw new Error("AI rewrite service unavailable. Please try again later.");
            }

            // Clean up the rewritten text
            rewrittenText = rewrittenText
                .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                .replace(/^\s*REWRITTEN TEXT:\s*/i, '') // Remove any prefixes
                .replace(/^\s*IMPROVED VERSION:\s*/i, '')
                .trim();

            if (!rewrittenText || rewrittenText.length < 10) {
                throw new Error("Rewrite produced insufficient content");
            }

            // Calculate rewritten text score
            const rewrittenScore = Math.round(calculateComplexityScore(rewrittenText));

            console.log("Rewrite completed:", {
                originalLength: args.text.length,
                rewrittenLength: rewrittenText.length,
                originalScore,
                rewrittenScore,
                improvement: rewrittenScore - originalScore
            });

            return {
                rewritten: rewrittenText,
                originalScore,
                rewrittenScore
            };

        } catch (error) {
            console.error("Text rewrite failed:", error);
            throw new Error(`Rewrite failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
});