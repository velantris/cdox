import { DOCUMENT_TYPE_FEE_SCHEDULE, DOCUMENT_TYPE_LOAN_AGREEMENT, DOCUMENT_TYPE_OTHER, DOCUMENT_TYPE_PP, DOCUMENT_TYPE_REGULATORY_DISPUTE, DOCUMENT_TYPE_TNC, GDPR, JURISDICTION_EU, JURISDICTION_FRANCE, JURISDICTION_GERMANY, JURISDICTION_ITALY, JURISDICTION_NETHERLANDS, JURISDICTION_SPAIN, MIFID, PSD2, TARGET_AUDIENCE_BUSINESS_CUSTOMER, TARGET_AUDIENCE_GENERAL_PUBLIC, TARGET_AUDIENCE_INSTITUTIONAL_CLIENT, TARGET_AUDIENCE_RETAIL_CUSTOMER } from "./prompt"


export const makePrompt = (document: string, documentType: string, targetAudience: string, jurisdiction: string, regulations: string) => {
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

    const final_prompt = `
    You are a helpful assistant that analyzes documents for comprehensibility.
    You will be given a document and a set of criteria to evaluate the document against.
    You will need to evaluate the document against the criteria and return a score for each criterion.
    You will also need to provide a summary of the document and any recommendations for improvement.
    Dont nitpick small issues, if given 1 to 100 this should be 70% strict.

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

        Return the following in JSON format:
        {
            "summary": "A summary of the document (100 words max string)",
            "recommendations": ["Array of recommendation strings"],
            "score": 75,
            "issues": [
                {
                    "original_text": "The problematic text from the document",
                    "issue_explanation": "Explanation of why this is an issue",
                    "suggested_rewrite": "Suggested improvement",
                    "grading": "medium",
                    "issue_type": "Legal jargon",
                    "section_category": "Introduction",
                    "score": 60
                }
            ]
        }
    `

    return final_prompt;
}