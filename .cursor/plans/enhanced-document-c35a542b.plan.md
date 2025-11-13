<!-- c35a542b-daa9-4230-9cb9-a60ad49abeca 835c4a67-a39d-40f5-9c73-5ec13dff08c7 -->
# Enhanced Document Accessibility Features

## Overview

Expand Cleardoc Platform with deterministic ISO compliance checks, CEFR B2/plain language validation, configurable scoring, shareable reports, and HTML document analysis.

## Feature 1: ISO PDF Structure Validation (PDF/UA + PDF/A)

**Goal**: Add deterministic checks for PDF/UA (ISO 14289) and PDF/A (ISO 19005) compliance.

### Implementation Steps:

1. **Add PDF structure validation libraries**

- Install `pdf-lib` enhancements or `verapdf-rest-client` for PDF/A validation
- Add library for PDF/UA checks (tagged PDF structure)

2. **Create PDF structure validator module** (`lib/pdf-structure-validator.ts`)

- PDF/UA checks: Tagged content, reading order, alt text for images, proper heading hierarchy, form field labels
- PDF/A checks: Embedded fonts, color spaces, no encryption, valid metadata, no external dependencies
- Return structured compliance data

3. **Extend schema** (`convex/schema.ts`)

- Add `pdf_structure_compliance` field to `analysis` table:
- `pdf_ua_compliance`: boolean + detailed issues array
- `pdf_a_compliance`: boolean + version (PDF/A-1, PDF/A-2, PDF/A-3) + issues array
- `structure_issues`: array of specific structural problems

4. **Integrate into analysis pipeline** (`convex/analysis_action.ts`)

- After text extraction, run PDF structure validation
- Store results in analysis record
- Include structural issues in overall issue count

5. **Update report generation** (`lib/report.ts`)

- Add "PDF Structure Compliance" section to CSV/PDF/text reports
- Show PDF/UA and PDF/A compliance status
- List structural issues with severity

## Feature 2: CEFR B2 Level & Plain Language Checks

**Goal**: Assess language complexity using CEFR B2 standards and WCAG plain language guidelines.

### Implementation Steps:

1. **Install language analysis libraries**

- `compromise` or `natural` for linguistic analysis
- Consider using Gemini/OpenAI for CEFR assessment in prompts

2. **Create language complexity analyzer** (`lib/language-complexity-analyzer.ts`)

- CEFR B2 vocabulary checks (most common 3000-4000 words)
- Sentence complexity (subordinate clauses, passive voice)
- Grammar pattern complexity
- Technical jargon detection
- Plain language scoring per WCAG guidelines

3. **Extend schema** (`convex/schema.ts`)

- Add `language_complexity` field to `analysis`:
- `cefr_level`: estimated CEFR level (A1-C2)
- `b2_compliance_score`: percentage (0-100)
- `plain_language_score`: percentage (0-100)
- `vocabulary_complexity`: object with metrics
- `sentence_complexity`: object with metrics
- `readability_adjusted`: adjusted Flesch-Kincaid for B2

4. **Update AI prompts** (`lib/prompts/prompt.ts`)

- Add explicit CEFR B2 evaluation instructions
- Request vocabulary complexity assessment
- Ask for plain language recommendations

5. **Integrate into analysis** (`convex/analysis_action.ts`)

- Run language complexity analysis after text extraction
- Pass results to AI for context-aware issue detection
- Store B2 compliance metrics

6. **Update reports** (`lib/report.ts`)

- Add "Language Complexity Assessment" section
- Show CEFR level estimate and B2 compliance score
- Display plain language score with recommendations

## Feature 3: Configurable Scoring Algorithm

**Goal**: Allow customization of scoring weights and thresholds per business needs.

### Implementation Steps:

1. **Create scoring configuration schema** (`convex/schema.ts`)

- New `scoringConfigs` table:
- `name`: configuration name
- `isDefault`: boolean
- `severityWeights`: { critical, high, medium, low }
- `categoryWeights`: { clarity, legal, accessibility, etc. }
- `thresholds`: { pass, warning, fail } score boundaries
- `createdAt`, `updatedAt`

2. **Create scoring service** (`lib/scoring-service.ts`)

- `calculateScore(issues, config)`: compute score with custom weights
- `getScoreInterpretation(score, thresholds)`: pass/warning/fail
- `applyCategoryWeights(issues, weights)`: adjust issue impact by category
- Export default configuration

3. **Update score calculation** (`lib/report.ts`)

- Modify `calculateComprehensibilityScore()` to accept config
- Apply category-specific weights
- Use custom thresholds for interpretation

4. **Add configuration mutations** (`convex/scoringConfigs.ts`)

- `createScoringConfig`: create new configuration
- `updateScoringConfig`: update existing config
- `getScoringConfigs`: query all configs
- `getDefaultConfig`: get active default

5. **Create configuration UI** (`app/dashboard/settings/page.tsx`)

- Section for managing scoring configurations
- Sliders for severity weights (0-50 points)
- Sliders for category weights (0.5-2.0 multipliers)
- Input fields for score thresholds
- Save/Load/Reset configuration options

6. **Apply in analysis** (`convex/analysis_action.ts`)

- Allow passing `scoringConfigId` as optional parameter
- Use custom config when calculating final score
- Store config reference in analysis record

## Feature 4: Shareable Report Links

**Goal**: Generate public shareable links for reports (PDF/CSV) with optional watermarking.

### Implementation Steps:

1. **Extend schema** (`convex/schema.ts`)

- New `sharedReports` table:
- `analysisId`: reference to analysis
- `shareToken`: unique secure token (UUID)
- `expiresAt`: optional expiration timestamp
- `accessCount`: number of views
- `includeWatermark`: boolean
- `watermarkText`: optional custom text
- `createdAt`, `lastAccessedAt`

2. **Create share mutations** (`convex/sharedReports.ts`)

- `createShareLink({ analysisId, expiresInDays?, includeWatermark?, watermarkText? })`
- `getSharedReport({ shareToken })`
- `revokeShareLink({ shareToken })`
- `trackAccess({ shareToken })`: increment access count

3. **Add watermarking to reports** (`lib/report.ts`)

- Update `generatePDFReport()` to accept `watermarkText?` parameter
- Add watermark overlay on each page (diagonal, semi-transparent)
- Update `generateCSVReport()` to include watermark text in header

4. **Create share dialog component** (`components/share-report-dialog.tsx`)

- Button to generate share link
- Copy link button
- QR code generation for easy mobile access
- Expiration date selector
- Watermark toggle and custom text input

5. **Create public report page** (`app/reports/[token]/page.tsx`)

- Public route (no auth required)
- Verify token validity and expiration
- Fetch analysis and issues data
- Display read-only report view
- Track access
- Download buttons for PDF/CSV with watermarks

6. **Add to document page** (`app/dashboard/documents/[id]/page.tsx`)

- "Share Report" button in header
- Show existing share links
- Revoke/regenerate options

## Feature 5: HTML Document Analysis

**Goal**: Support HTML document upload and analysis with same comprehensibility checks plus HTML-specific accessibility validation.

### Implementation Steps:

1. **Install HTML parsing libraries**

- `jsdom` or `cheerio` for DOM parsing
- `axe-core` for automated accessibility testing
- `html-validate` for semantic HTML validation

2. **Create HTML extractor** (`lib/html-text-extraction.ts`)

- Parse HTML and extract text content
- Preserve structure (headings, lists, tables)
- Extract metadata (title, lang, etc.)
- Return plain text + structured data

3. **Create HTML accessibility validator** (`lib/html-accessibility-validator.ts`)

- Semantic HTML checks: proper heading hierarchy, landmarks, lists
- ARIA validation: correct roles, states, properties
- Form accessibility: labels, fieldsets, error messages
- Image alt text presence and quality
- Color contrast validation
- Keyboard navigation checks
- Return structured issues array

4. **Extend upload handler** (`convex/upload.ts`)

- Accept `text/html` content type
- Store HTML files in Convex storage

5. **Update analysis action** (`convex/analysis_action.ts`)

- Detect content type (PDF vs HTML)
- Route to appropriate extractor
- For HTML: run both text analysis AND accessibility validation
- Merge issues from both sources

6. **Extend schema** (`convex/schema.ts`)

- Add `html_accessibility` field to `analysis`:
- `semantic_html_score`: percentage
- `aria_compliance`: boolean + issues
- `wcag_automated_score`: percentage
- `keyboard_navigation`: pass/fail
- `color_contrast_issues`: count

7. **Update issue types** (`convex/schema.ts`)

- Add HTML-specific issue types to validation:
- "html_semantic", "aria", "keyboard", "color_contrast", "form_accessibility"

8. **Create HTML-specific report sections** (`lib/report.ts`)

- Add "HTML Accessibility Assessment" section
- Show semantic HTML score
- ARIA compliance status
- WCAG automated test results
- List HTML-specific issues separately

9. **Update UI** (`app/dashboard/doc-new/page.tsx`)

- Accept `.html` and `.htm` file types
- Show appropriate file type icon
- Update validation messages

## Key Files to Create/Modify

**New Files:**

- `lib/pdf-structure-validator.ts`
- `lib/language-complexity-analyzer.ts`
- `lib/scoring-service.ts`
- `lib/html-text-extraction.ts`
- `lib/html-accessibility-validator.ts`
- `convex/scoringConfigs.ts`
- `convex/sharedReports.ts`
- `components/share-report-dialog.tsx`
- `app/reports/[token]/page.tsx`

**Modified Files:**

- `convex/schema.ts` - extensive additions
- `convex/analysis_action.ts` - integrate new validators
- `convex/upload.ts` - support HTML files
- `lib/report.ts` - new report sections
- `lib/prompts/prompt.ts` - CEFR B2 instructions
- `app/dashboard/settings/page.tsx` - scoring config UI
- `app/dashboard/documents/[id]/page.tsx` - share button
- `app/dashboard/doc-new/page.tsx` - HTML upload support

## Testing Strategy

Each feature should have:

1. Unit tests for core logic (validators, extractors, scoring)
2. Integration tests for Convex mutations/actions
3. E2E tests for UI workflows (upload, share, configure)

## Rollout Priority

1. **Phase 1** (Highest Impact): ISO PDF validation + CEFR B2 checks
2. **Phase 2**: Configurable scoring system
3. **Phase 3**: Shareable report links
4. **Phase 4**: HTML document analysis

Each phase can be developed and deployed independently.

### To-dos

- [ ] Implement PDF/UA and PDF/A structure validation with detailed compliance reporting
- [ ] Add CEFR B2 language complexity assessment and plain language scoring
- [ ] Create configurable scoring system with custom weights and thresholds
- [ ] Build shareable report links with expiration and watermarking
- [ ] Implement HTML document analysis with accessibility validation