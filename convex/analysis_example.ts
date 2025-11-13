// Example usage of the analysis processing system
// This file demonstrates how to use the analysis functions

import { api } from "./_generated/api";

/*
Example workflow for using the analysis processing system:

1. Create a scan (document upload):
   const scanId = await ctx.runMutation(api.scans.createScan, {
     name: "Contract Analysis",
     url: "https://example.com/contract.pdf",
     language: "english",
     documentType: "contract",
     targetAudience: "legal team",
     jurisdiction: "US",
     regulations: "GDPR, CCPA"
   });

2. Start analysis processing:
   const result = await ctx.runAction(api.analysis_action.performDocumentAnalysis, {
     scanId: scanId
   });

3. Check analysis status:
   const analysis = await ctx.runQuery(api.analysis.getAnalysis, {
     id: result.analysisId
   });

4. Get analysis results by scan:
   const analyses = await ctx.runQuery(api.analysis.getAnalysisByScan, {
     scanId: scanId
   });

5. Get issues found in the analysis:
   const issues = await ctx.runQuery(api.issues.getIssuesByAnalysis, {
     analysisId: result.analysisId
   });

Key Features:
- Scan-based data structure (replaces document-based)
- Real-time status tracking (pending -> completed/failed)
- AI model processing (OpenAI)
- Automatic issue extraction and creation
- Comprehensive error handling
- Support for multiple document formats (PDF, DOCX, DOC, TXT)

Status Flow:
- Analysis starts with "pending" status
- On success: status becomes "completed" with results
- On failure: status becomes "failed" with error message

Error Handling:
- Document extraction failures
- AI model API failures
- Invalid JSON responses
- Network connectivity issues
- File format not supported

The system is designed to be resilient and provide meaningful feedback
even when partial failures occur (e.g., one AI model fails but the other succeeds).
*/

export const ANALYSIS_EXAMPLE_USAGE = {
    createScan: "api.scans.createScan",
    startAnalysis: "api.analysis_action.performDocumentAnalysis",
    checkStatus: "api.analysis.getAnalysis",
    getAnalysesByScan: "api.analysis.getAnalysisByScan",
    getIssues: "api.issues.getIssuesByAnalysis"
} as const;