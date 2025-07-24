
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ComprehensibilityReportData {
    id: string;
    name: string;
    documentType: string;
    language: string;
    targetAudience: string;
    jurisdiction: string;
    regulations: string;
    status: string;
    url: string;
    startedAt: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    analysisId?: string;
    comprehensibilityScore?: number;
    analysis?: {
        summary: string;
        recommendations: (string | {
            heading: string;
            points: string[];
            priority: "high" | "medium" | "low";
            category?: string;
            impact_score?: number;
            implementation_effort?: "low" | "medium" | "high";
        })[];
        readability_metrics?: {
            flesch_kincaid_grade?: number;
            avg_sentence_length?: number;
            complex_words_percentage?: number;
            passive_voice_percentage?: number;
        };
        accessibility_assessment?: {
            wcag_compliance_level?: "AA" | "A" | "Non-compliant";
            screen_reader_compatibility?: "high" | "medium" | "low";
            cognitive_accessibility?: "high" | "medium" | "low";
            multilingual_considerations?: string;
        };
        compliance_status?: {
            regulatory_alignment?: "full" | "partial" | "non-compliant";
            transparency_score?: number;
            legal_risk_areas?: string[];
            improvement_priority?: "high" | "medium" | "low";
        };
    };
    issues: {
        id: string;
        severity: string;
        type: string;
        status: string;
        section: string;
        originalText: string;
        issueExplanation: string;
        suggestedRewrite: string;
        offsetStart?: number;
        offsetEnd?: number;
    }[];
    stats: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        openCount: number;
        closedCount: number;
    };
}

interface ComplianceMapping {
    [key: string]: {
        title: string;
        category: string;
        description: string;
        importance: string;
    };
}

const complianceCategories: ComplianceMapping = {
    clarity: {
        title: "Content Clarity",
        category: "Comprehensibility",
        description: "Ensures content is clear and easily understood by target audience",
        importance: "Critical for user comprehension"
    },
    grammar: {
        title: "Grammar & Language",
        category: "Language Quality",
        description: "Proper grammar, spelling, and language usage",
        importance: "Essential for professional communication"
    },
    style: {
        title: "Writing Style",
        category: "Readability",
        description: "Consistent tone, voice, and writing style throughout document",
        importance: "Important for brand consistency"
    },
    legal: {
        title: "Legal Compliance",
        category: "Legal Requirements",
        description: "Adherence to legal language and disclosure requirements",
        importance: "Critical for regulatory compliance"
    },
    compliance: {
        title: "Regulatory Compliance",
        category: "Regulatory Requirements",
        description: "Compliance with industry-specific regulations and standards",
        importance: "Critical for regulatory compliance"
    },
    structure: {
        title: "Document Structure",
        category: "Organization",
        description: "Logical flow, proper headings, and document organization",
        importance: "Important for navigation and understanding"
    },
    other: {
        title: "Other Issues",
        category: "Miscellaneous",
        description: "Additional issues that don't fit other categories",
        importance: "Varies by specific issue"
    }
};

export function calculateComprehensibilityScore(issues: ComprehensibilityReportData['issues']): number {
    if (issues.length === 0) return 100;

    const severityWeights = {
        critical: 25,
        high: 15,
        medium: 8,
        low: 3
    };

    const totalDeduction = issues.reduce((total, issue) => {
        const weight = severityWeights[issue.severity as keyof typeof severityWeights] || 5;
        return total + weight;
    }, 0);

    return Math.max(0, Math.min(100, 100 - totalDeduction));
}

export async function generateCSVReport(data: ComprehensibilityReportData): Promise<string> {
    const comprehensibilityScore = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);
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
    rows.push(["Overall Comprehensibility Score", `${comprehensibilityScore}%`]);
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

    // Accessibility Assessment
    if (data.analysis?.accessibility_assessment) {
        rows.push([]);
        rows.push(["ACCESSIBILITY ASSESSMENT"]);
        rows.push([]);
        const access = data.analysis.accessibility_assessment;
        rows.push(["Assessment Category", "Rating"]);
        if (access.wcag_compliance_level) rows.push(["WCAG Compliance Level", access.wcag_compliance_level]);
        if (access.screen_reader_compatibility) rows.push(["Screen Reader Compatibility", access.screen_reader_compatibility]);
        if (access.cognitive_accessibility) rows.push(["Cognitive Accessibility", access.cognitive_accessibility]);
        if (access.multilingual_considerations) rows.push(["Multilingual Considerations", access.multilingual_considerations]);
    }

    // Compliance Status
    if (data.analysis?.compliance_status) {
        rows.push([]);
        rows.push(["COMPLIANCE STATUS"]);
        rows.push([]);
        const compliance = data.analysis.compliance_status;
        rows.push(["Compliance Category", "Status"]);
        if (compliance.regulatory_alignment) rows.push(["Regulatory Alignment", compliance.regulatory_alignment]);
        if (compliance.transparency_score) rows.push(["Transparency Score", `${compliance.transparency_score}/100`]);
        if (compliance.improvement_priority) rows.push(["Improvement Priority", compliance.improvement_priority]);
        if (compliance.legal_risk_areas && compliance.legal_risk_areas.length > 0) {
            rows.push(["Legal Risk Areas", compliance.legal_risk_areas.join("; ")]);
        }
    }

    // Compliance Category Analysis
    rows.push([]);
    rows.push(["COMPLIANCE CATEGORY ANALYSIS"]);
    rows.push([]);

    const categoryBreakdown = analyzeCategoryCompliance(data.issues);
    rows.push(["Category", "Issues Count", "Severity Distribution", "Compliance Score", "Priority Level"]);
    Object.entries(categoryBreakdown.categories).forEach(([category, stats]) => {
        const severityDist = `Critical: ${stats.critical}, High: ${stats.high}, Medium: ${stats.medium}, Low: ${stats.low}`;
        const priority = stats.critical > 0 ? "IMMEDIATE" : stats.high > 0 ? "HIGH" : stats.medium > 0 ? "MEDIUM" : "LOW";
        rows.push([
            complianceCategories[category]?.title || category,
            stats.total.toString(),
            severityDist,
            `${stats.complianceScore}%`,
            priority
        ]);
    });

    // Severity Impact Analysis
    rows.push([]);
    rows.push(["SEVERITY IMPACT ANALYSIS"]);
    rows.push([]);
    rows.push(["Severity Level", "Count", "Percentage", "Priority", "Recommended Timeline"]);

    const totalIssues = data.issues.length;
    const severityStats = data.stats;

    rows.push([
        "Critical",
        severityStats.critical.toString(),
        `${totalIssues > 0 ? ((severityStats.critical / totalIssues) * 100).toFixed(1) : '0'}%`,
        "IMMEDIATE",
        "Fix within 24-48 hours"
    ]);
    rows.push([
        "High",
        severityStats.high.toString(),
        `${totalIssues > 0 ? ((severityStats.high / totalIssues) * 100).toFixed(1) : '0'}%`,
        "HIGH",
        "Fix within 1 week"
    ]);
    rows.push([
        "Medium",
        severityStats.medium.toString(),
        `${totalIssues > 0 ? ((severityStats.medium / totalIssues) * 100).toFixed(1) : '0'}%`,
        "MEDIUM",
        "Fix within 2 weeks"
    ]);
    rows.push([
        "Low",
        severityStats.low.toString(),
        `${totalIssues > 0 ? ((severityStats.low / totalIssues) * 100).toFixed(1) : '0'}%`,
        "LOW",
        "Fix within 1 month"
    ]);

    // Section Analysis
    rows.push([]);
    rows.push(["SECTION-LEVEL ANALYSIS"]);
    rows.push([]);

    const sectionStats = analyzeSectionIssues(data.issues);
    rows.push(["Section", "Total Issues", "Critical", "High", "Medium", "Low", "Primary Concerns"]);

    Object.entries(sectionStats).slice(0, 15).forEach(([section, stats]) => {
        const topIssues = stats.topIssueTypes.slice(0, 2).join("; ");
        rows.push([
            section,
            stats.total.toString(),
            stats.critical.toString(),
            stats.high.toString(),
            stats.medium.toString(),
            stats.low.toString(),
            topIssues
        ]);
    });

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
        "Suggested Improvement",
        "Text Position"
    ]);

    data.issues.forEach(issue => {
        const categoryInfo = complianceCategories[issue.type] || {
            title: issue.type,
            category: "Unknown",
            description: "Category information not available"
        };

        const originalExcerpt = issue.originalText.length > 100
            ? issue.originalText.substring(0, 97) + "..."
            : issue.originalText;

        const suggestionExcerpt = issue.suggestedRewrite.length > 100
            ? issue.suggestedRewrite.substring(0, 97) + "..."
            : issue.suggestedRewrite;

        const position = issue.offsetStart && issue.offsetEnd
            ? `Chars ${issue.offsetStart}-${issue.offsetEnd}`
            : "Not specified";

        rows.push([
            issue.id,
            categoryInfo.title,
            issue.severity.toUpperCase(),
            issue.status.toUpperCase(),
            issue.section,
            issue.type,
            originalExcerpt,
            issue.issueExplanation,
            suggestionExcerpt,
            position
        ]);
    });

    // AI Recommendations
    if (data.analysis?.recommendations && data.analysis.recommendations.length > 0) {
        rows.push([]);
        rows.push(["AI-GENERATED RECOMMENDATIONS"]);
        rows.push([]);
        rows.push(["Priority", "Heading", "Category", "Impact Score", "Implementation Effort", "Details"]);

        data.analysis.recommendations.forEach((rec, index) => {
            if (typeof rec === "string") {
                rows.push([
                    `${index + 1}`,
                    rec.substring(0, 50) + (rec.length > 50 ? "..." : ""),
                    "General",
                    "N/A",
                    "N/A",
                    rec
                ]);
            } else {
                rows.push([
                    `${index + 1}`,
                    rec.heading,
                    rec.category || "General",
                    rec.impact_score?.toString() || "N/A",
                    rec.implementation_effort || "N/A",
                    rec.points.join("; ")
                ]);
            }
        });
    }

    // Regulatory Compliance Assessment
    rows.push([]);
    rows.push(["REGULATORY COMPLIANCE ASSESSMENT"]);
    rows.push([]);

    const regulatoryIssues = data.issues.filter(i => i.type === 'legal' || i.type === 'compliance');
    const complianceScore = calculateComplianceScore(regulatoryIssues, data.regulations);

    rows.push(["Applicable Regulations", data.regulations]);
    rows.push(["Regulatory Compliance Score", `${complianceScore}%`]);
    rows.push(["Legal/Compliance Issues Found", regulatoryIssues.length.toString()]);
    rows.push(["Critical Regulatory Issues", regulatoryIssues.filter(i => i.severity === 'critical').length.toString()]);

    // Recommendations Section
    rows.push([]);
    rows.push(["PRIORITIZED RECOMMENDATIONS"]);
    rows.push([]);

    const recommendations = generatePrioritizedRecommendations(data);
    rows.push(["Priority", "Recommendation", "Category", "Expected Impact", "Effort Level", "Timeline"]);
    recommendations.forEach((rec, index) => {
        rows.push([
            `${index + 1}`,
            rec.title,
            rec.category,
            rec.impact,
            rec.effort,
            rec.timeline
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

export async function generatePDFReport(data: ComprehensibilityReportData): Promise<Buffer> {
    const comprehensibilityScore = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);

    // --- Modern Color Palette ---
    const colors = {
        primary: rgb(0.2, 0.4, 0.8),
        critical: rgb(0.9, 0.2, 0.2),
        high: rgb(0.95, 0.5, 0.1),
        medium: rgb(0.95, 0.8, 0.2),
        low: rgb(0.2, 0.7, 0.3),
        text: rgb(0.2, 0.2, 0.2),
        background: rgb(0.98, 0.98, 0.98),
        lightGray: rgb(0.9, 0.9, 0.9),
        mediumGray: rgb(0.7, 0.7, 0.7),
    };

    // --- PDF Setup ---
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 60;

    // --- Cover Page ---
    // Header
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: colors.primary });
    page.drawText("DOCUMENT ANALYSIS REPORT", {
        x: 50, y: height - 50, size: 28, font: helveticaBold, color: rgb(1, 1, 1)
    });
    // Score Box
    const scoreColor = comprehensibilityScore >= 85 ? colors.low : comprehensibilityScore >= 70 ? colors.medium : comprehensibilityScore >= 50 ? colors.high : colors.critical;
    page.drawRectangle({ x: width - 180, y: height - 120, width: 120, height: 60, color: scoreColor });
    page.drawText(`${comprehensibilityScore}`, {
        x: width - 140, y: height - 90, size: 36, font: helveticaBold, color: rgb(1, 1, 1)
    });
    page.drawText("Score", {
        x: width - 120, y: height - 110, size: 12, font: helvetica, color: rgb(1, 1, 1)
    });
    // Document Info
    page.drawText(`Document: ${data.name}`, { x: 50, y: height - 110, size: 14, font: helvetica });
    page.drawText(`Type: ${formatDocumentType(data.documentType)}`, { x: 50, y: height - 130, size: 12, font: helvetica });
    page.drawText(`Created: ${new Date(data.createdAt).toLocaleDateString()}`, { x: 50, y: height - 150, size: 12, font: helvetica });
    page.drawText(`Language: ${data.language}`, { x: 50, y: height - 170, size: 12, font: helvetica });
    page.drawText(`Audience: ${data.targetAudience}`, { x: 50, y: height - 190, size: 12, font: helvetica });
    page.drawText(`Jurisdiction: ${data.jurisdiction}`, { x: 50, y: height - 210, size: 12, font: helvetica });
    page.drawText(`Regulations: ${data.regulations}`, { x: 50, y: height - 230, size: 12, font: helvetica });
    page.drawText(`Status: ${data.status.toUpperCase()}`, { x: 50, y: height - 250, size: 12, font: helvetica });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, { x: 50, y: height - 270, size: 12, font: helvetica });

    // --- Stat Boxes ---
    y = height - 300;
    const stats = [
        { label: "Critical", value: data.stats.critical, color: colors.critical },
        { label: "High", value: data.stats.high, color: colors.high },
        { label: "Medium", value: data.stats.medium, color: colors.medium },
        { label: "Low", value: data.stats.low, color: colors.low },
    ];
    const boxWidth = (width - 120) / stats.length;
    stats.forEach((stat, i) => {
        const x = 60 + i * (boxWidth + 10);
        page.drawRectangle({ x, y: y - 40, width: boxWidth, height: 40, color: stat.color, opacity: 0.15 });
        page.drawRectangle({ x, y: y - 40, width: boxWidth, height: 40, borderColor: stat.color, borderWidth: 1 });
        page.drawText(stat.label, { x: x + 10, y: y - 20, size: 12, font: helveticaBold, color: stat.color });
        page.drawText(`${stat.value}`, { x: x + boxWidth - 30, y: y - 20, size: 18, font: helveticaBold, color: stat.color });
    });

    // --- Section: Summary ---
    y = y - 70;
    page.drawRectangle({ x: 40, y: y - 60, width: width - 80, height: 50, color: colors.background });
    page.drawText("Summary", { x: 60, y: y - 20, size: 16, font: helveticaBold, color: colors.text });
    if (data.analysis?.summary) {
        page.drawText(data.analysis.summary.substring(0, 300), { x: 60, y: y - 40, size: 12, font: helvetica, color: colors.text, maxWidth: width - 120 });
    }

    // --- Section: Readability Metrics ---
    y = y - 80;
    page.drawRectangle({ x: 40, y: y - 60, width: width - 80, height: 50, color: colors.background });
    page.drawText("Readability Metrics", { x: 60, y: y - 20, size: 14, font: helveticaBold, color: colors.primary });
    if (data.analysis?.readability_metrics) {
        const metrics = data.analysis.readability_metrics;
        let my = y - 40;
        if (metrics.flesch_kincaid_grade) page.drawText(`Reading Level: ${metrics.flesch_kincaid_grade.toFixed(1)}`, { x: 60, y: my, size: 11, font: helvetica, color: colors.text });
        if (metrics.avg_sentence_length) page.drawText(`Avg Sentence Length: ${metrics.avg_sentence_length.toFixed(1)}`, { x: 220, y: my, size: 11, font: helvetica, color: colors.text });
        if (metrics.complex_words_percentage) page.drawText(`Complex Words: ${metrics.complex_words_percentage.toFixed(1)}%`, { x: 400, y: my, size: 11, font: helvetica, color: colors.text });
        if (metrics.passive_voice_percentage) page.drawText(`Passive Voice: ${metrics.passive_voice_percentage.toFixed(1)}%`, { x: 560, y: my, size: 11, font: helvetica, color: colors.text });
    }

    // --- Section: Accessibility Assessment ---
    y = y - 80;
    page.drawRectangle({ x: 40, y: y - 60, width: width - 80, height: 50, color: colors.background });
    page.drawText("Accessibility Assessment", { x: 60, y: y - 20, size: 14, font: helveticaBold, color: colors.primary });
    if (data.analysis?.accessibility_assessment) {
        const access = data.analysis.accessibility_assessment;
        let my = y - 40;
        if (access.wcag_compliance_level) page.drawText(`WCAG Compliance: ${access.wcag_compliance_level}`, { x: 60, y: my, size: 11, font: helvetica, color: colors.text });
        if (access.screen_reader_compatibility) page.drawText(`Screen Reader: ${access.screen_reader_compatibility}`, { x: 220, y: my, size: 11, font: helvetica, color: colors.text });
        if (access.cognitive_accessibility) page.drawText(`Cognitive Access: ${access.cognitive_accessibility}`, { x: 400, y: my, size: 11, font: helvetica, color: colors.text });
        if (access.multilingual_considerations) page.drawText(`Multilingual: ${access.multilingual_considerations.substring(0, 40)}`, { x: 560, y: my, size: 11, font: helvetica, color: colors.text });
    }

    // --- Section: Compliance Status ---
    y = y - 80;
    page.drawRectangle({ x: 40, y: y - 60, width: width - 80, height: 50, color: colors.background });
    page.drawText("Compliance Status", { x: 60, y: y - 20, size: 14, font: helveticaBold, color: colors.primary });
    if (data.analysis?.compliance_status) {
        const compliance = data.analysis.compliance_status;
        let my = y - 40;
        if (compliance.regulatory_alignment) page.drawText(`Regulatory Alignment: ${compliance.regulatory_alignment}`, { x: 60, y: my, size: 11, font: helvetica, color: colors.text });
        if (compliance.transparency_score) page.drawText(`Transparency Score: ${compliance.transparency_score}/100`, { x: 220, y: my, size: 11, font: helvetica, color: colors.text });
        if (compliance.improvement_priority) page.drawText(`Priority: ${compliance.improvement_priority}`, { x: 400, y: my, size: 11, font: helvetica, color: colors.text });
        if (compliance.legal_risk_areas && compliance.legal_risk_areas.length > 0) page.drawText(`Legal Risks: ${compliance.legal_risk_areas.slice(0, 2).join(", ")}`, { x: 560, y: my, size: 11, font: helvetica, color: colors.text });
    }

    // --- Section: Recommendations ---
    y = y - 80;
    page.drawRectangle({ x: 40, y: y - 60, width: width - 80, height: 50, color: colors.background });
    page.drawText("Top Recommendations", { x: 60, y: y - 20, size: 14, font: helveticaBold, color: colors.primary });
    if (data.analysis?.recommendations && data.analysis.recommendations.length > 0) {
        data.analysis.recommendations.slice(0, 5).forEach((rec, idx) => {
            const text = typeof rec === "string" ? rec : rec.heading;
            page.drawText(`${idx + 1}. ${text.substring(0, 60)}`, { x: 70, y: y - 40 - idx * 12, size: 11, font: helvetica, color: colors.text });
        });
    }

    // --- Section: Issues (Paginated, 4 per page) ---
    let issueIdx = 0;
    while (issueIdx < data.issues.length) {
        if (issueIdx === 0) {
            // First page, continue below recommendations
            y = y - 90;
        } else {
            page = pdfDoc.addPage();
            y = height - 60;
        }
        page.drawText("Detailed Issues", { x: 60, y: y, size: 14, font: helveticaBold, color: colors.primary });
        y -= 20;
        for (let i = 0; i < 4 && issueIdx < data.issues.length; i++, issueIdx++) {
            const issue = data.issues[issueIdx];
            const color = issue.severity === "critical" ? colors.critical : issue.severity === "high" ? colors.high : issue.severity === "medium" ? colors.medium : colors.low;
            page.drawRectangle({ x: 50, y: y - 70, width: width - 100, height: 60, color, opacity: 0.08 });
            page.drawRectangle({ x: 50, y: y - 70, width: width - 100, height: 60, borderColor: color, borderWidth: 1 });
            page.drawText(`${issue.severity.toUpperCase()} - ${issue.type}`, { x: 60, y: y - 20, size: 12, font: helveticaBold, color });
            page.drawText(`Section: ${issue.section}`, { x: 60, y: y - 35, size: 10, font: helvetica, color: colors.text });
            page.drawText(`Status: ${issue.status.toUpperCase()}`, { x: 220, y: y - 35, size: 10, font: helvetica, color: colors.text });
            page.drawText(`Issue: ${issue.issueExplanation.substring(0, 60)}`, { x: 60, y: y - 50, size: 10, font: helvetica, color: colors.text });
            page.drawText(`Original: ${issue.originalText.substring(0, 60)}`, { x: 60, y: y - 60, size: 9, font: helvetica, color: colors.text });
            page.drawText(`Suggested: ${issue.suggestedRewrite.substring(0, 60)}`, { x: 320, y: y - 60, size: 9, font: helvetica, color: colors.text });
            y -= 80;
        }
    }

    // --- Footer (on all pages) ---
    pdfDoc.getPages().forEach((p, i) => {
        const { width } = p.getSize();
        p.drawLine({ start: { x: 50, y: 40 }, end: { x: width - 50, y: 40 }, color: colors.primary, thickness: 2 });
        p.drawText(`Cleardoc Platform | Page ${i + 1} of ${pdfDoc.getPages().length}`, { x: 50, y: 25, size: 9, font: helvetica, color: colors.mediumGray });
    });

    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

// Utility function to generate a text report
export function generateTextReport(data: ComprehensibilityReportData): string {
    const comprehensibilityScore = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);

    return `
COMPREHENSIBILITY & COMPLIANCE REPORT
=====================================

Document: ${data.name}
Type: ${formatDocumentType(data.documentType)}
Language: ${data.language}
Target Audience: ${data.targetAudience}
Jurisdiction: ${data.jurisdiction}
Regulations: ${data.regulations}
Status: ${data.status.toUpperCase()}

COMPREHENSIBILITY SCORE: ${comprehensibilityScore}%

ISSUES OVERVIEW:
- Total Issues: ${data.stats.total}
- Critical: ${data.stats.critical}
- High: ${data.stats.high}
- Medium: ${data.stats.medium}
- Low: ${data.stats.low}
- Open: ${data.stats.openCount}
- Closed: ${data.stats.closedCount}

${data.analysis?.summary ? `
ANALYSIS SUMMARY:
${data.analysis.summary}
` : ''}

${data.analysis?.readability_metrics ? `
READABILITY METRICS:
${data.analysis.readability_metrics.flesch_kincaid_grade ? `- Reading Level: ${data.analysis.readability_metrics.flesch_kincaid_grade.toFixed(1)}` : ''}
${data.analysis.readability_metrics.avg_sentence_length ? `- Avg Sentence Length: ${data.analysis.readability_metrics.avg_sentence_length.toFixed(1)}` : ''}
${data.analysis.readability_metrics.complex_words_percentage ? `- Complex Words: ${data.analysis.readability_metrics.complex_words_percentage.toFixed(1)}%` : ''}
${data.analysis.readability_metrics.passive_voice_percentage ? `- Passive Voice: ${data.analysis.readability_metrics.passive_voice_percentage.toFixed(1)}%` : ''}
` : ''}

REGULATORY COMPLIANCE:
${data.issues.filter(i => i.type === 'legal' || i.type === 'compliance').length} regulatory issues found.

DETAILED ISSUES:
${data.issues.map((issue, index) => `
${index + 1}. ${complianceCategories[issue.type]?.title || issue.type} (${issue.severity.toUpperCase()})
   Section: ${issue.section}
   Issue: ${issue.issueExplanation}
   Original: "${issue.originalText.substring(0, 100)}${issue.originalText.length > 100 ? '...' : ''}"
   Suggested: "${issue.suggestedRewrite.substring(0, 100)}${issue.suggestedRewrite.length > 100 ? '...' : ''}"
   Status: ${issue.status.toUpperCase()}
`).join('\n')}

Generated by Cleardoc Platform on ${new Date().toLocaleString()}
`.trim();
}

// Helper functions
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

function analyzeCategoryCompliance(issues: ComprehensibilityReportData['issues']) {
    const categories = {
        clarity: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 },
        grammar: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 },
        style: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 },
        legal: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 },
        compliance: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 },
        structure: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 },
        other: { total: 0, critical: 0, high: 0, medium: 0, low: 0, complianceScore: 100 }
    };

    issues.forEach(issue => {
        const category = categories[issue.type as keyof typeof categories];
        if (category) {
            category.total++;
            category[issue.severity as keyof Omit<typeof category, 'total' | 'complianceScore'>]++;
        }
    });

    // Calculate compliance scores
    Object.keys(categories).forEach(key => {
        const category = categories[key as keyof typeof categories];
        const deduction = category.critical * 20 + category.high * 12 + category.medium * 6 + category.low * 2;
        category.complianceScore = Math.max(0, 100 - deduction);
    });

    return { categories };
}

function analyzeSectionIssues(issues: ComprehensibilityReportData['issues']) {
    const sectionStats: Record<string, {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        topIssueTypes: string[];
    }> = {};

    issues.forEach(issue => {
        if (!sectionStats[issue.section]) {
            sectionStats[issue.section] = {
                total: 0,
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                topIssueTypes: []
            };
        }

        const stats = sectionStats[issue.section];
        stats.total++;
        stats[issue.severity as keyof Omit<typeof stats, 'total' | 'topIssueTypes'>]++;

        if (!stats.topIssueTypes.includes(issue.type)) {
            stats.topIssueTypes.push(issue.type);
        }
    });

    return sectionStats;
}

function calculateComplianceScore(regulatoryIssues: ComprehensibilityReportData['issues'], regulations: string): number {
    if (regulatoryIssues.length === 0) return 100;

    const deduction = regulatoryIssues.reduce((total, issue) => {
        const weights = { critical: 30, high: 20, medium: 10, low: 5 };
        return total + (weights[issue.severity as keyof typeof weights] || 5);
    }, 0);

    return Math.max(0, 100 - deduction);
}

function generatePrioritizedRecommendations(data: ComprehensibilityReportData) {
    const issuesByType = data.issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
    }, {} as Record<string, typeof data.issues>);

    const recommendations = [
        {
            title: "Resolve Critical Compliance Issues",
            category: "Legal Compliance",
            impact: "High - Essential for regulatory compliance",
            effort: "High",
            timeline: "1-2 days",
            condition: () => data.issues.some(i => i.severity === 'critical' && (i.type === 'legal' || i.type === 'compliance'))
        },
        {
            title: "Improve Content Clarity",
            category: "Comprehensibility",
            impact: "High - Directly affects user understanding",
            effort: "Medium",
            timeline: "1 week",
            condition: () => issuesByType.clarity?.length > 0
        },
        {
            title: "Fix Grammar and Language Issues",
            category: "Language Quality",
            impact: "Medium - Improves professionalism",
            effort: "Low",
            timeline: "2-3 days",
            condition: () => issuesByType.grammar?.length > 0
        },
        {
            title: "Enhance Document Structure",
            category: "Organization",
            impact: "Medium - Improves navigation and readability",
            effort: "Medium",
            timeline: "1 week",
            condition: () => issuesByType.structure?.length > 0
        },
        {
            title: "Standardize Writing Style",
            category: "Readability",
            impact: "Medium - Ensures consistent voice",
            effort: "Medium",
            timeline: "1-2 weeks",
            condition: () => issuesByType.style?.length > 0
        },
        {
            title: "Address Legal Language Requirements",
            category: "Legal Compliance",
            impact: "High - Required for legal validity",
            effort: "High",
            timeline: "1 week",
            condition: () => issuesByType.legal?.length > 0
        },
        {
            title: "Implement Regular Review Process",
            category: "Quality Assurance",
            impact: "High - Prevents future issues",
            effort: "Low",
            timeline: "Ongoing",
            condition: () => true
        },
        {
            title: "Simplify Complex Terminology",
            category: "Comprehensibility",
            impact: "High - Improves accessibility for all users",
            effort: "Medium",
            timeline: "2 weeks",
            condition: () => data.issues.some(i => i.type === 'clarity' && i.issueExplanation.includes('complex'))
        }
    ];

    return recommendations.filter(rec => rec.condition());
}
