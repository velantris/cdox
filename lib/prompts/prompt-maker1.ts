import type { LanguageComplexityAnalysis } from "../language-complexity-analyzer";
import { DOCUMENT_TYPE_FEE_SCHEDULE, DOCUMENT_TYPE_LOAN_AGREEMENT, DOCUMENT_TYPE_OTHER, DOCUMENT_TYPE_PP, DOCUMENT_TYPE_REGULATORY_DISPUTE, DOCUMENT_TYPE_TNC, GDPR, JURISDICTION_EU, JURISDICTION_FRANCE, JURISDICTION_GERMANY, JURISDICTION_ITALY, JURISDICTION_NETHERLANDS, JURISDICTION_SPAIN, MIFID, PSD2, TARGET_AUDIENCE_BUSINESS_CUSTOMER, TARGET_AUDIENCE_GENERAL_PUBLIC, TARGET_AUDIENCE_INSTITUTIONAL_CLIENT, TARGET_AUDIENCE_RETAIL_CUSTOMER } from "./prompt.js";

export const makePrompt = (
    document: string,
    documentType: string,
    targetAudience: string,
    jurisdiction: string,
    regulations: string,
    language: string = "english",
    customRules: any[] = [],
    languageComplexity?: LanguageComplexityAnalysis
) => {
    // Map UI option values (used in /new and /upload pages) to their corresponding prompt templates
    const documentTypePrompt =
        documentType === "terms"
            ? DOCUMENT_TYPE_TNC
            : documentType === "privacy"
                ? DOCUMENT_TYPE_PP
                : documentType === "loan"
                    ? DOCUMENT_TYPE_LOAN_AGREEMENT
                    : documentType === "fee"
                        ? DOCUMENT_TYPE_FEE_SCHEDULE
                        : documentType === "disclosure"
                            ? DOCUMENT_TYPE_REGULATORY_DISPUTE
                            : documentType === "other"
                                ? DOCUMENT_TYPE_OTHER
                                : ""

    const targetAudiencePrompt =
        targetAudience === "retail"
            ? TARGET_AUDIENCE_RETAIL_CUSTOMER
            : targetAudience === "business"
                ? TARGET_AUDIENCE_BUSINESS_CUSTOMER
                : targetAudience === "institutional"
                    ? TARGET_AUDIENCE_INSTITUTIONAL_CLIENT
                    : targetAudience === "general"
                        ? TARGET_AUDIENCE_GENERAL_PUBLIC
                        : ""

    const jurisdictionPrompt =
        jurisdiction === "eu"
            ? JURISDICTION_EU
            : jurisdiction === "de"
                ? JURISDICTION_GERMANY
                : jurisdiction === "fr"
                    ? JURISDICTION_FRANCE
                    : jurisdiction === "it"
                        ? JURISDICTION_ITALY
                        : jurisdiction === "es"
                            ? JURISDICTION_SPAIN
                            : jurisdiction === "nl"
                                ? JURISDICTION_NETHERLANDS
                                : ""

    const regulationsPrompt =
        regulations === "gdpr"
            ? GDPR
            : regulations === "mifid"
                ? MIFID
                : regulations === "psd2"
                    ? PSD2
                    : ""

    // Format custom rules for the prompt if any are provided
    let customRulesPrompt = "";
    if (customRules && customRules.length > 0) {
        customRulesPrompt = `
        Custom Rules to Apply:
        ${customRules.map((rule, index) => `
        Rule ${index + 1}: ${rule.name}
        - Type: ${rule.type}
        - Pattern: ${rule.pattern}
        - Severity: ${rule.severity}
        - Description: ${rule.description}
        `).join('\n')}
        
        When analyzing the document, pay special attention to these custom rules and flag any violations.
        `;
    }

    // Language-specific instructions
    const languageInstructions = language === "english" ? "" : `
    CRITICAL LANGUAGE REQUIREMENT:
    - Generate ALL output (summary, recommendations, issue explanations, and suggested rewrites) in ${language.toUpperCase()}
    - The summary must be written in ${language}
    - The recommendations must be written in ${language}
    - All issue explanations must be written in ${language}
    - All suggested rewrites must be written in ${language}
    `;

    const languageComplexityContext = languageComplexity ? `
        LANGUAGE COMPLEXITY SNAPSHOT (Pre-analysis Metrics):
        - Estimated CEFR Level: ${languageComplexity.cefrLevel}
        - B2 Compliance Score: ${languageComplexity.b2ComplianceScore.toFixed(1)}%
        - Plain Language Score: ${languageComplexity.plainLanguageScore.toFixed(1)}%
        - Average Sentence Length: ${languageComplexity.sentenceComplexity.averageSentenceLength.toFixed(1)} words
        - Passive Voice Usage: ${languageComplexity.sentenceComplexity.passiveVoicePercentage.toFixed(1)}%
        - Advanced Vocabulary Share: ${languageComplexity.vocabularyComplexity.advancedWordPercentage.toFixed(1)}%

        Compare your findings with these metrics. Highlight any discrepancies (higher or lower) in your summary and recommendations.
        Prioritise guidance that moves the document toward CEFR B2 accessibility and WCAG plain language alignment.
    ` : "";

    const final_prompt = `
    You are an expert document comprehensibility analyst specializing in legal and regulatory documents.
    
    Your task is to analyze the provided document for clarity, accessibility, and compliance.
    
    ANALYSIS STANDARDS & ISSUE SELECTION:
    - Be SELECTIVE and FLAG ONLY SUBSTANTIVE PROBLEMS that materially impact user understanding
    - NOT EVERY improvable sentence is an "issue" - focus on significant barriers to comprehension
    - An issue should be flagged ONLY if it:
      * Uses unnecessarily complex legal jargon without explanation for a lay audience
      * Contains ambiguous or misleading language that could confuse users about their rights/obligations
      * Violates regulatory requirements for plain language or disclosure
      * Has structural problems (missing headings, wall-of-text paragraphs >10 lines, poor formatting)
      * Uses passive voice or complex syntax that materially obscures meaning for the target audience
    - DO NOT flag minor stylistic preferences, slightly long sentences that are still clear, or industry-standard terms appropriate for the audience
    - Typical high-quality financial documents should have 10-30 issues, not 50-100
    - Your goal is to identify the TOP priority improvements, not to catalog every possible refinement
    - Consider the specific document type, audience, and regulatory context
    - Explicitly evaluate whether the document meets CEFR B2 expectations and WCAG plain language guidance
    - Flag overly advanced vocabulary (outside the most common 3000-4000 words) only when it creates a real barrier for the target audience

        Document:
        ${document}

        Document Type:
        ${documentTypePrompt}

        Target Audience:
        ${targetAudiencePrompt}
        
        Jurisdiction:
        ${jurisdictionPrompt}

        Regulations:
        ${regulationsPrompt}
        
        ${customRulesPrompt}

        ${languageInstructions}

        ${languageComplexityContext}

        RESPONSE FORMAT:
        Return your analysis in valid JSON format with the following structure:
        {
            "summary": "Comprehensive summary of the document content including its main purpose, key sections, and primary comprehensibility concerns. Focus on what the document actually contains and covers (max 150 words)",
            "recommendations": [
                {
                    "heading": "Specific, actionable recommendations based on the actual document content and issues found",
                    "points": [
                        "Recommendations should address real problems identified in this specific document",
                        "Focus on high-impact changes that improve clarity for the target audience"
                    ],
                    "priority": "high" | "medium" | "low"
                }
            ],
            "score": 80,
            "issues": [
                {
                    "offset_start": 1234,
                    "offset_end": 1297,
                    "original_text": "A short, exact quote from the document demonstrating the issue. Keep it concise, ideally under 500 characters.",
                    "issue_explanation": "Clear explanation of why this specific text is problematic for the target audience",
                    "suggested_rewrite": "Concrete example of how to improve this specific text while maintaining legal accuracy",
                    "grading": "medium",
                    "issue_type": "Legal jargon",
                    "section_category": "Terms and Conditions",
                    "score": 96
                }
            ]
        }
        
        CRITICAL REQUIREMENTS FOR ORIGINAL_TEXT:
        - The "original_text" MUST be copied EXACTLY as it appears in the document
        - DO NOT paraphrase, summarize, or rewrite the original text in any way
        - DO NOT change capitalization, punctuation, or spacing
        - DO NOT add quotation marks or formatting that isn't in the original
        - The selected text should be concise, but provide enough context to understand the issue.
        - This should be a literal copy-paste of the text that demonstrates the issue
        - Think of it as highlighting text in a PDF - you're selecting the exact characters

        IMPORTANT: 
        - You are judged on whether the original_text map to **exact** characters in the document
        - Ensure all JSON is properly formatted and escaped
        - Provide specific, implementable rewrites based on the actual document content
        - Score should reflect OVERALL document comprehensibility (0-100):
          * 85-100: Excellent - Clear, accessible, minor improvements only
          * 70-84: Good - Generally clear with some areas for improvement
          * 50-69: Fair - Multiple significant issues that impact comprehension
          * 30-49: Poor - Major barriers to understanding, substantial work needed
          * 0-29: Critical - Document is very difficult to understand, requires major revision
        - Consider that professional financial documents often score 60-80, not 20-40
        - The score should reflect the document's fitness for its target audience
        - Summary must include a sentence assessing CEFR B2 alignment and calling out any gaps
        - Include at least one recommendation explicitly focused on plain language or vocabulary simplification
        - Recommendations should be specific to problems found in this document
    `

    return final_prompt;
}