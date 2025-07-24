import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

// Helper function to convert report data to the expected format
function transformReportData(data: any) {
    return {
        id: data.id,
        name: data.name,
        documentType: data.documentType,
        language: data.language,
        targetAudience: data.targetAudience,
        jurisdiction: data.jurisdiction,
        regulations: data.regulations,
        status: data.status,
        url: data.url,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        analysisId: data.analysisId,
        comprehensibilityScore: data.comprehensibilityScore,
        analysis: data.analysis,
        issues: data.issues,
        stats: data.stats,
    };
}

// Helper function to generate CSV report data
async function generateCSVReport(data: any): Promise<string> {
    const rows: string[][] = [];

    // Executive Summary Section
    rows.push(["DOCUMENT COMPREHENSIBILITY & COMPLIANCE REPORT"]);
    rows.push([]);
    rows.push(["Generated", new Date().toLocaleString()]);
    rows.push(["Document ID", data.id]);
    rows.push(["Document Name", data.name]);
    rows.push(["Document Type", formatDocumentType(data.documentType)]);
    rows.push(["Language", data.language]);
    rows.push(["Target Audience", data.targetAudience]);
    rows.push(["Jurisdiction", data.jurisdiction]);
    rows.push(["Applicable Regulations", data.regulations]);
    rows.push(["Status", data.status.toUpperCase()]);
    rows.push(["Overall Comprehensibility Score", `${data.comprehensibilityScore || 0}%`]);
    rows.push(["Total Issues Found", data.stats.total.toString()]);
    rows.push(["Critical Issues", data.stats.critical.toString()]);
    rows.push(["High Priority Issues", data.stats.high.toString()]);
    rows.push(["Medium Priority Issues", data.stats.medium.toString()]);
    rows.push(["Low Priority Issues", data.stats.low.toString()]);
    rows.push(["Open Issues", data.stats.openCount.toString()]);
    rows.push(["Closed Issues", data.stats.closedCount.toString()]);

    rows.push(["Analysis Started", new Date(data.startedAt).toLocaleString()]);
    if (data.completedAt) rows.push(["Analysis Completed", new Date(data.completedAt).toLocaleString()]);

    // Analysis Summary
    if (data.analysis?.summary) {
        rows.push([]);
        rows.push(["ANALYSIS SUMMARY"]);
        rows.push([]);
        rows.push(["Summary", data.analysis.summary]);
    }

    // Readability Metrics
    if (data.analysis?.readability_metrics) {
        rows.push([]);
        rows.push(["READABILITY METRICS"]);
        rows.push([]);
        const metrics = data.analysis.readability_metrics;
        rows.push(["Metric", "Value"]);
        if (metrics.flesch_kincaid_grade) rows.push(["Flesch-Kincaid Grade Level", metrics.flesch_kincaid_grade.toFixed(1)]);
        if (metrics.avg_sentence_length) rows.push(["Average Sentence Length", metrics.avg_sentence_length.toFixed(1)]);
        if (metrics.complex_words_percentage) rows.push(["Complex Words Percentage", `${metrics.complex_words_percentage.toFixed(1)}%`]);
        if (metrics.passive_voice_percentage) rows.push(["Passive Voice Percentage", `${metrics.passive_voice_percentage.toFixed(1)}%`]);
    }

    // Detailed Issues
    rows.push([]);
    rows.push(["DETAILED ISSUE ANALYSIS"]);
    rows.push([]);
    rows.push([
        "Issue ID",
        "Category",
        "Severity",
        "Status",
        "Section",
        "Issue Type",
        "Original Text (Excerpt)",
        "Issue Explanation",
        "Suggested Improvement"
    ]);

    data.issues.forEach((issue: any) => {
        const originalExcerpt = issue.originalText.length > 100
            ? issue.originalText.substring(0, 97) + "..."
            : issue.originalText;

        const suggestionExcerpt = issue.suggestedRewrite.length > 100
            ? issue.suggestedRewrite.substring(0, 97) + "..."
            : issue.suggestedRewrite;

        rows.push([
            issue.id,
            issue.type,
            issue.severity.toUpperCase(),
            issue.status.toUpperCase(),
            issue.section,
            issue.type,
            originalExcerpt,
            issue.issueExplanation,
            suggestionExcerpt
        ]);
    });

    // Convert to CSV with proper escaping
    return rows
        .map(row =>
            row
                .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
                .join(",")
        )
        .join("\n");
}

function formatDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
        'terms': 'Terms of Service',
        'privacy': 'Privacy Policy',
        'loan': 'Loan Agreement',
        'fee': 'Fee Disclosure',
        'disclosure': 'Disclosure Document',
        'other': 'Other Document'
    };
    return typeMap[type] || type;
}

// Action to generate and return CSV or PDF report
export const generateReport = action({
    args: {
        scanId: v.id("scans"),
        format: v.union(v.literal("csv"), v.literal("pdf"))
    },
    handler: async (ctx, args) => {
        // Get comprehensive report data
        const reportData = await ctx.runQuery(api.scans.getReportData, { id: args.scanId });

        if (args.format === "csv") {
            const csvContent = await generateCSVReport(reportData);

            return {
                content: csvContent,
                filename: `${reportData.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.csv`,
                contentType: 'text/csv'
            };
        } else {
            // For PDF, import the report functions from lib/report.ts
            // Since we can't import browser-only libraries in Convex actions,
            // we'll generate a comprehensive text report with better formatting
            const textReport = `
COMPREHENSIBILITY & COMPLIANCE REPORT
=====================================

EXECUTIVE SUMMARY
-----------------
Document: ${reportData.name}
Document Type: ${formatDocumentType(reportData.documentType)}
Language: ${reportData.language}
Target Audience: ${reportData.targetAudience}
Jurisdiction: ${reportData.jurisdiction}
Regulations: ${reportData.regulations}
Status: ${reportData.status.toUpperCase()}
Comprehensibility Score: ${reportData.comprehensibilityScore || 0}%
Generated: ${new Date().toLocaleString()}

ISSUES SUMMARY
--------------
Total Issues: ${reportData.stats.total}
Critical Issues: ${reportData.stats.critical}
High Priority Issues: ${reportData.stats.high}
Medium Priority Issues: ${reportData.stats.medium}
Low Priority Issues: ${reportData.stats.low}
Open Issues: ${reportData.stats.openCount}
Closed Issues: ${reportData.stats.closedCount}

Analysis Started: ${new Date(reportData.startedAt).toLocaleString()}
${reportData.completedAt ? `Analysis Completed: ${new Date(reportData.completedAt).toLocaleString()}` : ''}

${reportData.analysis?.summary ? `
ANALYSIS SUMMARY
----------------
${reportData.analysis.summary}
` : ''}

${reportData.analysis?.readability_metrics ? `
READABILITY METRICS
-------------------
${reportData.analysis.readability_metrics.flesch_kincaid_grade ? `Reading Level: ${reportData.analysis.readability_metrics.flesch_kincaid_grade.toFixed(1)}` : ''}
${reportData.analysis.readability_metrics.avg_sentence_length ? `Average Sentence Length: ${reportData.analysis.readability_metrics.avg_sentence_length.toFixed(1)}` : ''}
${reportData.analysis.readability_metrics.complex_words_percentage ? `Complex Words: ${reportData.analysis.readability_metrics.complex_words_percentage.toFixed(1)}%` : ''}
${reportData.analysis.readability_metrics.passive_voice_percentage ? `Passive Voice: ${reportData.analysis.readability_metrics.passive_voice_percentage.toFixed(1)}%` : ''}
` : ''}

${reportData.analysis?.accessibility_assessment ? `
ACCESSIBILITY ASSESSMENT
------------------------
${reportData.analysis.accessibility_assessment.wcag_compliance_level ? `WCAG Compliance: ${reportData.analysis.accessibility_assessment.wcag_compliance_level}` : ''}
${reportData.analysis.accessibility_assessment.screen_reader_compatibility ? `Screen Reader Compatibility: ${reportData.analysis.accessibility_assessment.screen_reader_compatibility}` : ''}
${reportData.analysis.accessibility_assessment.cognitive_accessibility ? `Cognitive Accessibility: ${reportData.analysis.accessibility_assessment.cognitive_accessibility}` : ''}
${reportData.analysis.accessibility_assessment.multilingual_considerations ? `Multilingual Considerations: ${reportData.analysis.accessibility_assessment.multilingual_considerations}` : ''}
` : ''}

DETAILED ISSUES (First 20)
---------------------------
${reportData.issues.slice(0, 20).map((issue: any, index: number) => `
${index + 1}. ${issue.type.toUpperCase()} - ${issue.severity.toUpperCase()}
   Section: ${issue.section}
   Status: ${issue.status.toUpperCase()}
   
   Issue: ${issue.issueExplanation}
   
   Original Text: 
   "${issue.originalText.substring(0, 300)}${issue.originalText.length > 300 ? '...' : ''}"
   
   Suggested Rewrite: 
   "${issue.suggestedRewrite.substring(0, 300)}${issue.suggestedRewrite.length > 300 ? '...' : ''}"
   
   ${'='.repeat(60)}
`).join('\n')}

${reportData.issues.length > 20 ? `... and ${reportData.issues.length - 20} more issues. Download CSV for complete report.` : ''}

REGULATORY COMPLIANCE ASSESSMENT
--------------------------------
Applicable Regulations: ${reportData.regulations}
Legal/Compliance Issues Found: ${reportData.issues.filter((i: any) => i.type === 'legal' || i.type === 'compliance').length}
Critical Regulatory Issues: ${reportData.issues.filter((i: any) => (i.type === 'legal' || i.type === 'compliance') && i.severity === 'critical').length}

Generated by Cleardoc Platform on ${new Date().toLocaleString()}
`.trim();

            // Return as text file for now (PDF generation requires browser environment)
            return {
                content: textReport,
                filename: `${reportData.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.txt`,
                contentType: 'text/plain'
            };
        }
    }
}); 