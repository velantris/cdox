// DOCUMENT TYPE PROMPTS
export const DOCUMENT_TYPE_TNC = `Analyze this Terms and Conditions document for comprehensibility. Focus on:
1. Legal language complexity and jargon usage
2. Sentence structure and average sentence length
3. Clear explanation of user rights and obligations
4. Accessibility of key terms like termination, liability, and data usage
5. Logical flow and organization of clauses
6. Plain language alternatives for complex legal concepts
7. Readability scores (Flesch-Kincaid, SMOG, etc.)
8. Presence of examples or practical scenarios
9. Clarity of dispute resolution procedures
10. Transparency in fee structures and charges
Provide specific recommendations for improvement with rewritten examples where necessary.`

export const DOCUMENT_TYPE_PP = `Evaluate this Privacy Policy document for comprehensibility. Assess:
1. Clear explanation of data collection practices
2. Understandable description of data usage purposes
3. Transparent information about data sharing with third parties
4. Accessible language for user rights (access, deletion, portability)
5. Clear consent mechanisms and opt-out procedures
6. Comprehensible data retention policies
7. Understandable security measures explanation
8. Plain language for technical processes (cookies, tracking, analytics)
9. Clear contact information for privacy inquiries
10. Age-appropriate language for services targeting minors
11. Visual aids or flowcharts to explain data flows
12. Layered privacy notices with summary sections
Rate the document's compliance with transparency requirements and suggest improvements.`

export const DOCUMENT_TYPE_LOAN_AGREEMENT = `Assess this Loan Agreement for comprehensibility. Examine:
1. Clear presentation of loan terms (amount, interest rate, duration)
2. Transparent explanation of all fees and charges
3. Understandable repayment schedule and calculation methods
4. Clear consequences of default or late payments
5. Accessible language for collateral and security requirements
6. Plain language explanation of variable rate mechanisms
7. Transparent early repayment conditions and penalties
8. Clear explanation of insurance requirements
9. Understandable dispute resolution procedures
10. Accessible information about borrower rights and protections
11. Clear explanation of guarantor responsibilities (if applicable)
12. Transparent credit reporting implications
Provide readability assessment and suggest plain language alternatives for complex financial terms.`

export const DOCUMENT_TYPE_FEE_SCHEDULE = `Analyze this Fee Schedule for comprehensibility. Focus on:
1. Clear categorization and organization of all fees
2. Transparent pricing structure with no hidden charges
3. Understandable fee calculation methods
4. Clear conditions triggering each fee
5. Accessible language for fee waivers or reductions
6. Plain language explanation of variable fees
7. Clear effective dates and change notification procedures
8. Understandable currency and tax implications
9. Transparent comparison with market standards
10. Clear explanation of fee dispute procedures
11. Accessible information about fee optimization strategies
12. Visual presentation aids (tables, charts, examples)
Evaluate the document's transparency and suggest improvements for customer understanding.`

export const DOCUMENT_TYPE_OTHER = `Perform a comprehensive comprehensibility analysis of this document. Evaluate:
1. Document purpose and scope clarity
2. Target audience appropriateness of language level
3. Logical structure and information hierarchy
4. Technical terminology explanation and glossary usage
5. Sentence complexity and readability metrics
6. Visual design and formatting effectiveness
7. Cultural and linguistic accessibility considerations
8. Action items and next steps clarity
9. Contact information and support resources
10. Compliance with relevant accessibility standards
11. Use of plain language principles
12. Effectiveness of headings, bullet points, and white space
Provide detailed recommendations tailored to the document type and intended use.`

export const DOCUMENT_TYPE_REGULATORY_DISPUTE = `Evaluate this Regulatory Dispute document for comprehensibility. Assess:
1. Clear explanation of the dispute process and timeline
2. Understandable description of parties' rights and responsibilities
3. Accessible language for legal procedures and requirements
4. Clear explanation of evidence submission requirements
5. Transparent information about costs and fee arrangements
6. Understandable appeal procedures and deadlines
7. Clear explanation of potential outcomes and remedies
8. Accessible language for regulatory authority roles
9. Plain language explanation of settlement options
10. Clear contact information for assistance and inquiries
11. Understandable documentation requirements
12. Transparent confidentiality and disclosure policies
Rate the document's accessibility to non-legal audiences and suggest improvements.`

// TARGET AUDIENCE PROMPTS
export const TARGET_AUDIENCE_RETAIL_CUSTOMER = `Analyze this document for retail customer comprehensibility. Consider:
1. Age-appropriate language (typically 8th-10th grade reading level)
2. Avoidance of industry jargon and technical terminology
3. Use of everyday language and familiar concepts
4. Clear examples using relatable scenarios
5. Visual aids and infographics for complex information
6. Cultural sensitivity and inclusive language
7. Accessibility for diverse educational backgrounds
8. Clear call-to-action statements
9. Prominent placement of key information
10. Mobile-friendly formatting considerations
11. Multilingual accessibility needs
12. Clear explanation of customer rights and protections
Provide specific recommendations to improve accessibility for general consumers.`

export const TARGET_AUDIENCE_BUSINESS_CUSTOMER = `Evaluate this document for business customer comprehensibility. Focus on:
1. Professional terminology balanced with clarity
2. Industry-specific concepts explained appropriately
3. Clear business impact and operational implications
4. Structured presentation suitable for business decision-making
5. Comprehensive coverage of commercial terms
6. Clear explanation of business obligations and liabilities
7. Accessible language for compliance requirements
8. Transparent pricing and commercial arrangements
9. Clear explanation of service level agreements
10. Understandable termination and renewal procedures
11. Accessible dispute resolution mechanisms
12. Clear integration with existing business processes
Assess the document's suitability for business stakeholders and suggest improvements.`

export const TARGET_AUDIENCE_INSTITUTIONAL_CLIENT = `Assess this document for institutional client comprehensibility. Examine:
1. Sophisticated terminology appropriate for professional audience
2. Comprehensive technical detail with clear explanations
3. Regulatory compliance information clearly presented
4. Risk management implications thoroughly explained
5. Clear operational procedures and requirements
6. Transparent reporting and monitoring obligations
7. Accessible language for complex financial instruments
8. Clear explanation of institutional-specific terms
9. Comprehensive coverage of fiduciary responsibilities
10. Understandable audit and compliance requirements
11. Clear explanation of regulatory reporting obligations
12. Accessible information about institutional protections
Rate the document's appropriateness for sophisticated institutional users.`

export const TARGET_AUDIENCE_GENERAL_PUBLIC = `Analyze this document for general public comprehensibility. Consider:
1. Universal accessibility regardless of background
2. Simple language appropriate for diverse audiences
3. Clear explanations avoiding assumptions of prior knowledge
4. Cultural and linguistic inclusivity
5. Visual aids and plain language summaries
6. Clear navigation and information hierarchy
7. Accessibility compliance (WCAG guidelines)
8. Age-appropriate content for all potential users
9. Clear action items and next steps
10. Prominent contact information and support resources
11. Multiple format availability (audio, large print, etc.)
12. Clear explanation of public rights and protections
Provide recommendations for maximum public accessibility.`

// JURISDICTION PROMPTS
export const JURISDICTION_EU = `Evaluate this document for EU jurisdiction comprehensibility requirements. Assess:
1. Compliance with EU transparency and fairness directives
2. Clear explanation of cross-border implications
3. Accessible language for consumer protection requirements
4. Transparent information about applicable EU laws
5. Clear explanation of EU citizen rights
6. Understandable data protection obligations (GDPR compliance)
7. Accessible language for single market implications
8. Clear explanation of EU dispute resolution mechanisms
9. Transparent information about regulatory supervision
10. Understandable currency and payment implications
11. Clear explanation of EU withdrawal rights
12. Accessible information about EU compensation schemes
Rate compliance with EU transparency standards and suggest improvements.`

export const JURISDICTION_GERMANY = `Analyze this document for German jurisdiction comprehensibility. Focus on:
1. Compliance with German transparency requirements (BGB, AGB-Gesetz)
2. Clear German language presentation (Klartext-Initiative standards)
3. Accessible explanation of German consumer protection laws
4. Transparent information about German court jurisdiction
5. Clear explanation of German regulatory oversight (BaFin requirements)
6. Understandable German tax and legal implications
7. Accessible language for German contract law principles
8. Clear explanation of German data protection laws
9. Transparent information about German deposit protection
10. Understandable German employment law implications (if applicable)
11. Clear explanation of German insolvency protections
12. Accessible information about German ombudsman services
Evaluate compliance with German plain language requirements.`

export const JURISDICTION_FRANCE = `Assess this document for French jurisdiction comprehensibility. Examine:
1. Compliance with French consumer code transparency requirements
2. Clear French language presentation meeting legal standards
3. Accessible explanation of French consumer protection laws
4. Transparent information about French court jurisdiction
5. Clear explanation of French regulatory oversight (ACPR/AMF)
6. Understandable French tax and legal implications
7. Accessible language for French contract law principles
8. Clear explanation of Code de la consommation requirements
9. Transparent information about French guarantee schemes
10. Understandable French employment law implications (if applicable)
11. Clear explanation of French cooling-off periods
12. Accessible information about French mediation services
Rate compliance with French clarity and transparency standards.`

export const JURISDICTION_ITALY = `Evaluate this document for Italian jurisdiction comprehensibility. Focus on:
1. Compliance with Italian consumer code transparency requirements
2. Clear Italian language presentation meeting legal standards
3. Accessible explanation of Italian consumer protection laws
4. Transparent information about Italian court jurisdiction
5. Clear explanation of Italian regulatory oversight (Banca d'Italia/CONSOB)
6. Understandable Italian tax and legal implications
7. Accessible language for Italian contract law principles
8. Clear explanation of Codice del Consumo requirements
9. Transparent information about Italian guarantee schemes
10. Understandable Italian employment law implications (if applicable)
11. Clear explanation of Italian withdrawal rights
12. Accessible information about Italian ADR mechanisms
Assess compliance with Italian transparency and fairness standards.`

export const JURISDICTION_SPAIN = `Analyze this document for Spanish jurisdiction comprehensibility. Examine:
1. Compliance with Spanish consumer protection transparency requirements
2. Clear Spanish language presentation meeting legal standards
3. Accessible explanation of Spanish consumer rights (LGDCU)
4. Transparent information about Spanish court jurisdiction
5. Clear explanation of Spanish regulatory oversight (Banco de España/CNMV)
6. Understandable Spanish tax and legal implications
7. Accessible language for Spanish contract law principles
8. Clear explanation of Ley de Defensa de los Consumidores
9. Transparent information about Spanish guarantee schemes
10. Understandable Spanish employment law implications (if applicable)
11. Clear explanation of Spanish cooling-off periods
12. Accessible information about Spanish arbitration services
Rate compliance with Spanish clarity and consumer protection standards.`

export const JURISDICTION_NETHERLANDS = `Assess this document for Dutch jurisdiction comprehensibility. Focus on:
1. Compliance with Dutch consumer protection transparency requirements
2. Clear Dutch language presentation meeting legal standards
3. Accessible explanation of Dutch consumer rights
4. Transparent information about Dutch court jurisdiction
5. Clear explanation of Dutch regulatory oversight (DNB/AFM)
6. Understandable Dutch tax and legal implications
7. Accessible language for Dutch contract law principles
8. Clear explanation of Dutch Civil Code requirements
9. Transparent information about Dutch guarantee schemes
10. Understandable Dutch employment law implications (if applicable)
11. Clear explanation of Dutch withdrawal rights
12. Accessible information about Dutch complaint procedures (Kifid)
Evaluate compliance with Dutch transparency and fairness standards.`

// REGULATION PROMPTS
export const GDPR = `Evaluate this document for GDPR comprehensibility compliance. Assess:
1. Clear explanation of lawful bases for data processing
2. Transparent information about data subject rights (Articles 15-22)
3. Accessible language for consent mechanisms and withdrawal
4. Understandable data retention and deletion policies
5. Clear explanation of data transfer safeguards
6. Transparent information about automated decision-making
7. Accessible language for data breach notification procedures
8. Clear explanation of Data Protection Officer contact details
9. Understandable privacy impact assessment information
10. Transparent information about third-party data sharing
11. Clear explanation of children's data protection measures
12. Accessible language for international data transfers
Rate GDPR transparency compliance and suggest improvements for Articles 12-14 requirements.`

export const MIFID = `Analyze this document for MiFID II comprehensibility compliance. Focus on:
1. Clear explanation of investment services and financial instruments
2. Transparent information about costs and charges (all-in fee disclosure)
3. Accessible language for risk warnings and disclosures
4. Understandable client categorization and protection levels
5. Clear explanation of execution policy and best execution
6. Transparent information about conflicts of interest
7. Accessible language for suitability and appropriateness assessments
8. Clear explanation of investor compensation schemes
9. Understandable information about research and investment advice
10. Transparent product governance and target market information
11. Clear explanation of complaint handling procedures
12. Accessible language for regulatory reporting obligations
Evaluate compliance with MiFID II transparency and investor protection requirements.`

export const PSD2 = `Assess this document for PSD2 comprehensibility compliance. Examine:
1. Clear explanation of payment services and strong customer authentication
2. Transparent information about payment service fees and charges
3. Accessible language for payment initiation and account information services
4. Understandable liability and refund procedures
5. Clear explanation of authorized and unauthorized transactions
6. Transparent information about execution time and value dating
7. Accessible language for payment account access rights
8. Clear explanation of third-party provider authorizations
9. Understandable information about payment instrument blocking
10. Transparent complaint and dispute resolution procedures
11. Clear explanation of regulatory supervision and compliance
12. Accessible language for cross-border payment implications
Rate PSD2 transparency compliance and suggest improvements for consumer protection requirements.`