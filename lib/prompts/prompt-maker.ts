// import {
//     DOCUMENT_TYPE_FEE_SCHEDULE,
//     DOCUMENT_TYPE_LOAN_AGREEMENT,
//     DOCUMENT_TYPE_OTHER,
//     DOCUMENT_TYPE_PP,
//     DOCUMENT_TYPE_REGULATORY_DISPUTE,
//     DOCUMENT_TYPE_TNC,
//     GDPR,
//     JURISDICTION_EU,
//     JURISDICTION_FRANCE,
//     JURISDICTION_GERMANY,
//     JURISDICTION_ITALY,
//     JURISDICTION_NETHERLANDS,
//     JURISDICTION_SPAIN,
//     MIFID,
//     PSD2,
//     TARGET_AUDIENCE_BUSINESS_CUSTOMER,
//     TARGET_AUDIENCE_GENERAL_PUBLIC,
//     TARGET_AUDIENCE_INSTITUTIONAL_CLIENT,
//     TARGET_AUDIENCE_RETAIL_CUSTOMER
// } from "./prompt.js"

import { GDPR, JURISDICTION_EU, JURISDICTION_FRANCE, JURISDICTION_GERMANY, JURISDICTION_ITALY, JURISDICTION_NETHERLANDS, JURISDICTION_SPAIN, MIFID, PSD2 } from "./prompt"

export const makePrompt = (
    document: string,
    documentType: string,
    targetAudience: string,
    jurisdiction: string,
    regulations: string,
    language: string = "english",
    customRules: any[] = []
) => {
    // Map UI option values to their corresponding prompt templates
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

    const final_prompt = `
    You are an expert document comprehensibility analyst specializing in legal and regulatory documents with advanced training in plain language principles, accessibility standards, and cognitive load theory.
    
    Your task is to conduct a thorough, multi-dimensional analysis of the provided document for clarity, accessibility, regulatory compliance, and user experience optimization.
    
    ENHANCED ANALYSIS FRAMEWORK:
    
    1. COGNITIVE LOAD ASSESSMENT:
    - Evaluate information density and complexity layers
    - Assess working memory demands on readers
    - Identify cognitive bottlenecks and processing barriers
    - Apply rigorous but fair evaluation (aim for 70% strictness on a 1-100 scale)
    
    2. ACCESSIBILITY & INCLUSION:
    - Multi-sensory accessibility considerations
    - Cultural and linguistic inclusivity
    - Neurodiversity-friendly formatting
    - Educational background adaptability
    
    3. BEHAVIORAL ECONOMICS PRINCIPLES:
    - Decision architecture and choice presentation
    - Attention allocation and information hierarchy
    - Comprehension vs. compliance correlation
    - User journey and interaction flow
    
    4. REGULATORY COMPLIANCE DEPTH:
    - Legal requirement fulfillment assessment
    - Industry best practice benchmarking
    - Risk mitigation through clarity
    - Audit trail and documentation standards

    Document Content:
    ${document}

    Document Type Context:
    ${documentTypePrompt}

    Target Audience Profile:
    ${targetAudiencePrompt}
    
    Jurisdictional Requirements:
    ${jurisdictionPrompt}

    Regulatory Framework:
    ${regulationsPrompt}
    
    ${customRulesPrompt}

    ${languageInstructions}

    COMPREHENSIVE EVALUATION CRITERIA:

    READABILITY METRICS:
    - Flesch-Kincaid Grade Level (target: appropriate for audience)
    - Average sentence length (target: <20 words for general public, <25 for business)
    - Syllable complexity and polysyllabic word frequency
    - Passive voice usage percentage
    - Nominalization frequency
    - Subordinate clause density

    STRUCTURAL ANALYSIS:
    - Information hierarchy clarity and logical flow
    - Section organization and cross-referencing
    - Visual design elements and white space utilization
    - Navigation aids and wayfinding elements
    - Progressive disclosure implementation
    - Chunking and categorization effectiveness

    CONTENT QUALITY ASSESSMENT:
    - Technical term explanation adequacy
    - Example usage and practical scenario inclusion
    - Action item clarity and specificity
    - Consequence explanation completeness
    - Contact information accessibility
    - FAQ integration and anticipatory guidance

    RESPONSE FORMAT:
    Return your analysis in valid JSON format with the following structure. Fields marked (optional) may be omitted. Defaults are shown where applicable. Only use enum values where specified; otherwise, use strings as described.

    {
        "summary": "string (default: 'Analysis completed')",
        "recommendations": [
            {
                "heading": "string",
                "points": ["string"],
                "priority": "high" | "medium" | "low" (default: "medium"),
                "category": "string" (optional),
                "impact_score": number (optional),
                "implementation_effort": "low" | "medium" | "high" (optional)
            }
        ],
        "score": number (0-100, default: 50, Be a bit generous with the score score mostly based on number of issues and the severity of the issues), 
        "readability_metrics": {
            "flesch_kincaid_grade": number (optional),
            "avg_sentence_length": number (optional),
            "complex_words_percentage": number (optional),
            "passive_voice_percentage": number (optional)
        } (optional),
        "issues": [
            {
                "offset_start": number (optional),
                "offset_end": number (optional),
                "original_text": "string, max 300 chars" (default: ""),
                "issue_explanation": "string" (default: ""),
                "suggested_rewrite": "string" (default: ""),
                "grading": "high" | "medium" | "low" (default: "medium"),
                "issue_type": "string" (default: "other"),
                "section_category": "string" (default: "general"),
                "score": number (optional),
                "reading_level_impact": "string" (optional),
                "accessibility_impact": "string" (optional),
                "compliance_risk": "string" (optional)
            }
        ],
        "accessibility_assessment": {
            "wcag_compliance_level": "AA" | "A" | "Non-compliant" (optional),
            "screen_reader_compatibility": "high" | "medium" | "low" (optional),
            "cognitive_accessibility": "high" | "medium" | "low" (optional),
            "multilingual_considerations": "string" (optional)
        } (optional),
        "compliance_status": {
            "regulatory_alignment": "full" | "partial" | "non-compliant" (optional),
            "transparency_score": number (optional),
            "legal_risk_areas": ["string"] (optional),
            "improvement_priority": "high" | "medium" | "low" (optional)
        } (optional)
    }
    
    CRITICAL REQUIREMENTS FOR ANALYSIS ACCURACY:

    1. ORIGINAL_TEXT PRECISION:
    - Must be copied EXACTLY as it appears in the document
    - NO paraphrasing, summarization, or rewriting
    - Maintain exact capitalization, punctuation, spacing, and formatting
    - Select text that clearly demonstrates the identified issue
    - Aim for 100-300 characters for optimal context without overwhelming
    
    2. OFFSET ACCURACY:
    - Calculate precise character positions including spaces and formatting
    - Verify offsets correspond exactly to the original_text selection
    - Double-check alignment with document structure
    
    3. ISSUE IDENTIFICATION STANDARDS:
    - Focus on issues that materially impact user understanding
    - Prioritize problems affecting legal compliance or user rights
    - Consider cumulative cognitive load, not just individual word complexity
    - Assess real-world usage scenarios and user journey implications
    
    4. REWRITE QUALITY REQUIREMENTS:
    - Maintain complete legal accuracy and regulatory compliance
    - Achieve significant readability improvement (aim for 2-4 grade levels lower)
    - Preserve all essential information and legal protections
    - Use active voice, shorter sentences, and familiar vocabulary where possible
    - Include examples or explanations for complex concepts
    
    5. SCORING METHODOLOGY:
    - Overall score reflects genuine document comprehensibility (0-100 scale)
    - Don't artificially inflate or deflate scores - be genuinely evaluative
    - Consider cumulative impact of issues on user experience
    - Weight scores based on severity and frequency of problems
    - Factor in positive elements and effective clarity strategies

    QUALITY ASSURANCE CHECKLIST:
    ✓ All JSON properly formatted and escaped
    ✓ Original text matches document exactly
    ✓ Offsets calculated accurately
    ✓ Rewrites maintain legal integrity while improving clarity
    ✓ Issues address real comprehensibility barriers
    ✓ Recommendations are specific and actionable
    ✓ Summary describes actual document content, not generic analysis
    ✓ Scores reflect honest assessment of document quality
    ✓ Language requirements fulfilled if specified
    ✓ Accessibility and compliance factors integrated throughout analysis

    Remember: Your analysis directly impacts user understanding of important legal documents. Prioritize changes that will genuinely help real people understand their rights, obligations, and the consequences of their decisions.
    `;

    return final_prompt;
}

// ENHANCED DOCUMENT TYPE PROMPTS

export const DOCUMENT_TYPE_TNC = `Analyze this Terms and Conditions document for comprehensibility with enhanced focus on:

PRIMARY COMPREHENSIBILITY FACTORS:
1. Legal language complexity - identify unnecessary jargon and overly complex constructions
2. Sentence structure analysis - flag sentences over 25 words or with multiple clauses
3. User rights and obligations clarity - ensure average users can understand what they're agreeing to
4. Key terms accessibility - critical concepts like termination, liability, data usage must be crystal clear
5. Logical flow and organization - information should follow user's mental model and decision journey
6. Plain language implementation - provide concrete alternatives maintaining legal validity
7. Readability optimization - target 8th-10th grade level for consumer documents
8. Practical examples integration - abstract legal concepts need real-world illustrations
9. Dispute resolution transparency - users must understand their options and procedures
10. Fee and charge clarity - all costs must be presented transparently with calculation methods

ENHANCED EVALUATION CRITERIA:
- Cognitive load assessment for typical users
- Decision-making support adequacy
- Risk communication effectiveness
- Compliance verification methods
- User journey mapping through document sections
- Accessibility for diverse educational backgrounds
- Multi-device readability considerations
- Search and reference functionality

Provide specific, implementable recommendations with before/after examples demonstrating measurable comprehensibility improvements.`;

export const DOCUMENT_TYPE_PP = `Evaluate this Privacy Policy document for comprehensibility with comprehensive assessment of:

CORE COMPREHENSIBILITY REQUIREMENTS:
1. Data collection transparency - users must understand exactly what information is gathered and how
2. Purpose limitation clarity - each use of personal data must be explained in accessible language  
3. Third-party sharing visibility - partnerships and data transfers need clear, understandable disclosure
4. User rights empowerment - access, deletion, portability rights must be actionable, not just mentioned
5. Consent mechanism clarity - users must understand what they're agreeing to before clicking
6. Data retention comprehensibility - time periods and criteria must be explained in practical terms
7. Security measures communication - technical protections translated to user-understandable benefits
8. Technical process demystification - cookies, tracking, analytics explained without technical jargon
9. Contact accessibility - privacy inquiries must have clear, multiple pathways for resolution
10. Age-appropriate communication - special protections for minors must be clearly articulated
11. Visual information architecture - complex data flows need diagrams, flowcharts, or layered disclosure
12. Progressive disclosure implementation - summary sections with drill-down detail options

ADVANCED ANALYSIS DIMENSIONS:
- Trust-building language effectiveness
- Behavioral economics application in choice architecture
- Cultural sensitivity in privacy expectations
- Accessibility compliance for diverse abilities
- Mobile-first readability optimization
- International user comprehension considerations
- Legal requirement fulfillment vs. user understanding balance

Rate the document's transparency effectiveness and provide actionable improvements with user-centered design principles.`;

export const DOCUMENT_TYPE_LOAN_AGREEMENT = `Assess this Loan Agreement for comprehensibility with detailed examination of:

FINANCIAL COMPREHENSIBILITY ESSENTIALS:
1. Loan terms presentation - amount, interest rate, duration must be immediately understandable
2. Total cost transparency - all fees, charges, and final repayment amounts clearly calculated and displayed
3. Repayment schedule clarity - payment amounts, dates, and calculation methods in accessible format
4. Default consequences communication - realistic scenarios and outcomes explained without legal intimidation
5. Collateral requirements accessibility - security terms and implications in everyday language
6. Variable rate mechanism transparency - how and when rates change, with concrete examples
7. Early repayment conditions clarity - costs, benefits, and procedures explained comprehensively
8. Insurance requirement justification - coverage types, costs, and alternatives clearly presented
9. Dispute resolution pathway accessibility - step-by-step process for problem resolution
10. Borrower protection information - rights, remedies, and regulatory safeguards clearly explained
11. Guarantor responsibility clarity - if applicable, obligations and risks fully transparent
12. Credit impact transparency - how loan affects credit history and future borrowing capacity

ENHANCED FINANCIAL LITERACY SUPPORT:
- Complex financial concepts broken into digestible explanations
- Real-world examples with specific dollar amounts and scenarios
- Visual aids for payment schedules and cost comparisons
- Glossary of financial terms with practical definitions
- Decision support tools and comparison frameworks
- Risk assessment and mitigation guidance
- Alternative product information where relevant

Provide readability assessment with specific plain language alternatives for complex financial terminology, ensuring legal compliance while maximizing user understanding.`;

export const DOCUMENT_TYPE_FEE_SCHEDULE = `Analyze this Fee Schedule for comprehensibility with focus on:

TRANSPARENT PRICING COMMUNICATION:
1. Fee categorization and organization - logical grouping that matches user mental models
2. Pricing structure transparency - no hidden charges, all costs clearly disclosed upfront
3. Fee calculation methodology - how charges are determined, with worked examples
4. Triggering conditions clarity - exactly when each fee applies, with specific scenarios
5. Waiver and reduction accessibility - conditions and procedures for fee mitigation
6. Variable fee explanation - how and when fees change, with notification procedures
7. Effective date transparency - when new fees take effect, with adequate notice periods
8. Currency and tax implications - all additional costs and conversion factors clearly stated
9. Market comparison context - reasonable benchmarking information where helpful
10. Fee dispute procedures - clear pathways for challenging or questioning charges
11. Optimization guidance - legitimate strategies for minimizing fees where applicable
12. Visual presentation effectiveness - tables, charts, examples that enhance understanding

BEHAVIORAL ECONOMICS CONSIDERATIONS:
- Anchoring effects and reference point establishment
- Loss aversion mitigation through clear value proposition
- Choice architecture that supports informed decision-making
- Cognitive bias awareness in fee presentation
- Comparison facilitation tools and frameworks
- Decision timing optimization

Evaluate the document's user-centered design effectiveness and suggest improvements that balance business needs with customer understanding and trust-building.`;

export const DOCUMENT_TYPE_OTHER = `Perform a comprehensive comprehensibility analysis of this document with systematic evaluation of:

UNIVERSAL COMPREHENSIBILITY PRINCIPLES:
1. Document purpose and scope articulation - clear value proposition and relevance to reader
2. Audience-appropriate language calibration - vocabulary and complexity matching user expectations
3. Information architecture optimization - logical flow that supports user goals and mental models
4. Technical terminology management - necessary jargon explained, unnecessary complexity eliminated
5. Sentence complexity optimization - structure analysis with readability improvement recommendations
6. Visual design effectiveness - formatting, white space, and hierarchical presentation assessment
7. Cultural and linguistic inclusion - accessibility across diverse backgrounds and perspectives
8. Action item clarity and specificity - next steps and requirements clearly defined and achievable
9. Support resource accessibility - help, contact, and additional information clearly provided
10. Accessibility standards compliance - WCAG guidelines and universal design principles
11. Plain language implementation - concrete application of plain language principles throughout
12. User experience optimization - overall document usability and effectiveness assessment

CONTEXTUAL ADAPTATION FACTORS:
- Industry-specific communication norms and expectations
- Regulatory compliance requirements and transparency standards
- Stakeholder diversity and multi-audience considerations
- Digital vs. print optimization requirements
- International and multilingual accessibility needs
- Legal liability and risk management considerations
- Brand voice and organizational communication consistency

Provide detailed, actionable recommendations tailored to the specific document type, intended use case, and organizational context, with measurable improvement metrics and implementation guidance.`;

export const DOCUMENT_TYPE_REGULATORY_DISPUTE = `Evaluate this Regulatory Dispute document for comprehensibility with assessment of:

DISPUTE PROCESS TRANSPARENCY:
1. Process overview clarity - step-by-step timeline and procedure explanation in accessible language
2. Rights and responsibilities balance - clear articulation of what each party can expect and must provide
3. Legal procedure accessibility - complex regulatory processes translated to understandable actions
4. Evidence requirements specification - exactly what documentation is needed, in what format, by when
5. Cost structure transparency - all fees, potential expenses, and payment arrangements clearly disclosed
6. Appeal pathway clarity - options, deadlines, and procedures for challenging decisions
7. Outcome possibilities explanation - realistic range of potential resolutions and their implications
8. Regulatory authority role clarification - who does what, when, and with what authority
9. Settlement option accessibility - alternative resolution paths and their comparative advantages
10. Support resource availability - where to get help, ask questions, or clarify procedures
11. Documentation standard clarity - filing requirements, format specifications, and submission procedures
12. Confidentiality parameters - what information remains private vs. what becomes public record

PROCEDURAL JUSTICE CONSIDERATIONS:
- Fairness perception through clear communication
- Power imbalance mitigation through accessible information
- Cultural sensitivity in dispute resolution communication
- Accessibility for users with varying legal sophistication
- Emotional support and stress reduction through clarity
- Trust-building through transparent process communication

Rate the document's effectiveness in supporting non-expert users through complex regulatory procedures, with specific recommendations for reducing barriers to access and understanding.`;

// ENHANCED TARGET AUDIENCE PROMPTS

export const TARGET_AUDIENCE_RETAIL_CUSTOMER = `Analyze this document for retail customer comprehensibility with enhanced focus on:

CONSUMER-CENTERED COMMUNICATION:
1. Reading level optimization - target 8th-10th grade level with verification using multiple readability metrics
2. Jargon elimination strategy - industry terminology replaced with everyday language while maintaining precision
3. Familiar concept integration - complex ideas anchored to relatable experiences and common knowledge
4. Scenario-based explanation - abstract concepts illustrated through realistic, relevant examples
5. Visual communication enhancement - infographics, diagrams, and charts that reduce cognitive load
6. Cultural responsiveness - language and examples that resonate across diverse cultural backgrounds
7. Educational inclusivity - accessibility for varying levels of formal education and literacy
8. Action-oriented communication - clear, specific steps users can take with confidence
9. Key information prominence - critical details highlighted and easily discoverable
10. Mobile-optimized presentation - readability and usability on smartphone screens
11. Multilingual accessibility planning - considerations for non-native speakers and translation needs
12. Consumer protection emphasis - rights and safeguards prominently featured and explained

COGNITIVE ACCESSIBILITY ENHANCEMENTS:
- Working memory support through chunking and repetition
- Attention management through strategic information sequencing
- Decision support through comparison frameworks and decision trees
- Anxiety reduction through clear expectations and process transparency
- Confidence building through empowerment language and success indicators
- Error prevention through anticipatory guidance and common mistake warnings

Provide specific, research-backed recommendations for improving accessibility and engagement for general consumer audiences, with measurable outcomes and implementation strategies.`;

export const TARGET_AUDIENCE_BUSINESS_CUSTOMER = `Evaluate this document for business customer comprehensibility with focus on:

BUSINESS-CONTEXT OPTIMIZATION:
1. Professional communication balance - sophisticated enough for business context, clear enough for quick comprehension
2. Industry terminology calibration - appropriate technical language with context-specific definitions
3. Business impact articulation - clear connection between document content and operational implications
4. Decision-support structure - information organized to facilitate business planning and risk assessment
5. Commercial terms transparency - comprehensive coverage with unambiguous language and examples
6. Liability and obligation clarity - business responsibilities and potential consequences clearly articulated
7. Compliance requirement accessibility - regulatory obligations translated to actionable business practices
8. Commercial arrangement transparency - pricing, service levels, and performance metrics clearly defined
9. Service level agreement clarity - expectations, measurements, and remedies explicitly stated
10. Contract lifecycle management - termination, renewal, and modification procedures clearly explained
11. Dispute resolution efficiency - business-appropriate mechanisms that minimize operational disruption
12. Integration guidance - how document requirements fit with existing business processes and systems

BUSINESS DECISION-MAKING SUPPORT:
- Executive summary capabilities for time-constrained decision-makers
- Risk assessment frameworks and mitigation strategies
- Competitive analysis context where appropriate and legal
- ROI and cost-benefit analysis support
- Stakeholder communication templates and guidance
- Implementation timeline and resource requirement clarity

Assess the document's effectiveness in supporting informed business decision-making while maintaining legal precision and regulatory compliance.`;

export const TARGET_AUDIENCE_INSTITUTIONAL_CLIENT = `Assess this document for institutional client comprehensibility with examination of:

INSTITUTIONAL-GRADE COMMUNICATION:
1. Professional sophistication appropriateness - complex concepts presented with necessary detail and nuance
2. Technical precision with clarity - comprehensive coverage that doesn't sacrifice accessibility for completeness
3. Regulatory compliance integration - seamless incorporation of compliance requirements with practical guidance
4. Risk management framework - comprehensive coverage of risk identification, assessment, and mitigation strategies
5. Operational procedure specification - detailed processes that can be integrated into institutional workflows
6. Reporting and monitoring transparency - clear obligations, procedures, and performance measurement criteria
7. Financial instrument complexity management - sophisticated products explained with appropriate technical depth
8. Institutional terminology precision - industry-standard language used accurately with contextual clarification
9. Fiduciary responsibility articulation - comprehensive coverage of duties, standards, and accountability measures
10. Audit and compliance readiness - documentation and procedures that support regulatory examination
11. Regulatory reporting integration - clear connection between document requirements and reporting obligations
12. Institutional protection framework - comprehensive coverage of available safeguards and protections

INSTITUTIONAL DECISION-MAKING SUPPORT:
- Governance framework alignment guidance
- Due diligence support materials and checklists
- Board presentation and stakeholder communication support
- Regulatory examination preparation assistance
- Industry best practice benchmarking context
- Strategic planning integration guidance

Rate the document's appropriateness for sophisticated institutional users while ensuring clarity doesn't compromise comprehensiveness or regulatory adequacy.`;

export const TARGET_AUDIENCE_GENERAL_PUBLIC = `Analyze this document for general public comprehensibility with comprehensive assessment of:

UNIVERSAL ACCESSIBILITY PRINCIPLES:
1. Universal design implementation - accessible regardless of educational background, cultural context, or personal circumstances
2. Plain language mastery - complex concepts expressed in the simplest language possible without losing meaning
3. Assumption-free communication - no prior knowledge assumptions, with all necessary context provided
4. Cultural and linguistic universality - examples and language that resonate across diverse communities
5. Multi-modal accessibility - visual, auditory, and kinesthetic learning style accommodation
6. Navigation optimization - clear information hierarchy that supports different reading patterns and goals
7. Accessibility standard compliance - full WCAG AA compliance with consideration for AAA where feasible
8. Age-inclusive design - appropriate for users from late teens through elderly, accounting for cognitive changes
9. Action clarity and achievability - next steps that any motivated individual can successfully complete
10. Support ecosystem integration - comprehensive help resources, contact options, and assistance pathways
11. Format diversity consideration - content optimized for multiple presentation formats and assistive technologies
12. Rights empowerment focus - clear explanation of public rights, protections, and available remedies

INCLUSIVE DESIGN CONSIDERATIONS:
- Neurodiversity accommodation through structure and presentation choices
- Economic accessibility through free or low-cost access requirements
- Geographic inclusivity considering rural and urban access differences
- Technology literacy accommodation for varying levels of digital comfort
- Language barrier mitigation strategies and translation considerations  
- Disability accommodation beyond minimum legal requirements

Provide recommendations for achieving maximum public accessibility while maintaining document integrity and legal effectiveness, with specific attention to marginalized and underserved communities.`;

// ENHANCED JURISDICTION PROMPTS
// [Previous jurisdiction prompts remain the same but can be enhanced similarly]

// ENHANCED REGULATION PROMPTS  
// [Previous regulation prompts remain the same but can be enhanced similarly]