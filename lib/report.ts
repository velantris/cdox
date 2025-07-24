
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
        icon: string;
        color: string;
    };
}

const complianceCategories: ComplianceMapping = {
    clarity: {
        title: "Content Clarity & Understanding",
        category: "Comprehensibility",
        description: "Ensures content is clear, concise, and easily understood by the target audience",
        importance: "Critical for user comprehension and accessibility",
        icon: "C",
        color: "#3B82F6"
    },
    grammar: {
        title: "Grammar & Language Quality",
        category: "Language Standards",
        description: "Proper grammar, spelling, punctuation, and professional language usage",
        importance: "Essential for credibility and professional communication",
        icon: "G",
        color: "#10B981"
    },
    style: {
        title: "Writing Style & Voice",
        category: "Brand Consistency",
        description: "Consistent tone, voice, and writing style throughout the document",
        importance: "Important for brand consistency and user experience",
        icon: "S",
        color: "#8B5CF6"
    },
    legal: {
        title: "Legal Language & Disclosures",
        category: "Legal Compliance",
        description: "Adherence to legal language requirements and mandatory disclosures",
        importance: "Critical for legal validity and regulatory compliance",
        icon: "L",
        color: "#DC2626"
    },
    compliance: {
        title: "Regulatory & Industry Compliance",
        category: "Regulatory Requirements",
        description: "Compliance with industry-specific regulations, standards, and best practices",
        importance: "Critical for regulatory compliance and risk management",
        icon: "R",
        color: "#F59E0B"
    },
    structure: {
        title: "Document Structure & Navigation",
        category: "Information Architecture",
        description: "Logical flow, proper headings, section organization, and document hierarchy",
        importance: "Important for navigation, comprehension, and accessibility",
        icon: "N",
        color: "#06B6D4"
    },
    accessibility: {
        title: "Accessibility & Inclusion",
        category: "Universal Design",
        description: "Ensures document is accessible to users with disabilities and diverse needs",
        importance: "Critical for inclusivity and legal compliance",
        icon: "A",
        color: "#7C3AED"
    },
    security: {
        title: "Data Security & Privacy",
        category: "Information Security",
        description: "Proper handling of sensitive information and privacy considerations",
        importance: "Critical for data protection and user trust",
        icon: "P",
        color: "#EF4444"
    },
    transparency: {
        title: "Transparency & Disclosure",
        category: "Ethical Communication",
        description: "Clear, honest, and complete disclosure of important information",
        importance: "Essential for trust and regulatory compliance",
        icon: "T",
        color: "#059669"
    },
    other: {
        title: "General Improvements",
        category: "Quality Enhancement",
        description: "Additional improvements that enhance overall document quality",
        importance: "Varies by specific issue but contributes to overall excellence",
        icon: "*",
        color: "#6B7280"
    }
};

const severityLevels = {
    critical: {
        label: "Critical",
        color: "#DC2626",
        bgColor: "#FEF2F2",
        description: "Must be fixed immediately - poses significant legal or compliance risk",
        timeline: "Within 24 hours",
        weight: 25
    },
    high: {
        label: "High Priority",
        color: "#EA580C",
        bgColor: "#FFF7ED",
        description: "Should be fixed soon - significantly impacts comprehensibility",
        timeline: "Within 1 week",
        weight: 15
    },
    medium: {
        label: "Medium Priority",
        color: "#D97706",
        bgColor: "#FFFBEB",
        description: "Should be addressed - moderately impacts user experience",
        timeline: "Within 2 weeks",
        weight: 8
    },
    low: {
        label: "Low Priority",
        color: "#059669",
        bgColor: "#F0FDF4",
        description: "Consider addressing - minor impact on overall quality",
        timeline: "Within 1 month",
        weight: 3
    }
};

export function calculateComprehensibilityScore(issues: ComprehensibilityReportData['issues']): number {
    if (issues.length === 0) return 100;

    const totalDeduction = issues.reduce((total, issue) => {
        const severity = severityLevels[issue.severity as keyof typeof severityLevels];
        const weight = severity?.weight || 5;
        return total + weight;
    }, 0);

    return Math.max(0, Math.min(100, 100 - totalDeduction));
}

export async function generateCSVReport(data: ComprehensibilityReportData): Promise<string> {
    const comprehensibilityScore = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);
    const rows: string[][] = [];

    // === DOCUMENT METADATA & EXECUTIVE SUMMARY ===
    rows.push(["CLEARDOC PLATFORM - COMPREHENSIVE DOCUMENT ANALYSIS REPORT"]);
    rows.push([]);
    rows.push(["Report Generation Details"]);
    rows.push(["Generated On", new Date().toLocaleString()]);
    rows.push(["Report Version", "2.0"]);
    rows.push(["Analysis Engine", "Cleardoc AI"]);
    rows.push([]);

    rows.push(["Document Information"]);
    rows.push(["Document ID", data.id]);
    rows.push(["Document Name", data.name]);
    rows.push(["Document Type", formatDocumentType(data.documentType)]);
    rows.push(["Primary Language", data.language]);
    rows.push(["Target Audience", data.targetAudience]);
    rows.push(["Jurisdiction", data.jurisdiction]);
    rows.push(["Applicable Regulations", data.regulations]);
    rows.push(["Current Status", data.status.toUpperCase()]);
    rows.push(["Document URL/Source", data.url]);
    rows.push([]);

    rows.push(["Analysis Timeline"]);
    rows.push(["Analysis Started", new Date(data.startedAt).toLocaleString()]);
    if (data.completedAt) rows.push(["Analysis Completed", new Date(data.completedAt).toLocaleString()]);
    rows.push(["Document Created", new Date(data.createdAt).toLocaleString()]);
    rows.push(["Last Updated", new Date(data.updatedAt).toLocaleString()]);
    rows.push([]);

    // === EXECUTIVE SUMMARY ===
    rows.push(["EXECUTIVE SUMMARY"]);
    rows.push([]);
    rows.push(["Overall Comprehensibility Score", `${comprehensibilityScore}%`]);
    rows.push(["Score Interpretation", getScoreInterpretation(comprehensibilityScore)]);
    rows.push(["Total Issues Identified", data.stats.total.toString()]);
    rows.push(["Critical Issues Requiring Immediate Action", data.stats.critical.toString()]);
    rows.push(["High Priority Issues", data.stats.high.toString()]);
    rows.push(["Medium Priority Issues", data.stats.medium.toString()]);
    rows.push(["Low Priority Issues", data.stats.low.toString()]);
    rows.push(["Issues Currently Open", data.stats.openCount.toString()]);
    rows.push(["Issues Resolved", data.stats.closedCount.toString()]);
    rows.push(["Completion Progress", `${((data.stats.closedCount / Math.max(data.stats.total, 1)) * 100).toFixed(1)}%`]);
    rows.push([]);

    // === ANALYSIS SUMMARY ===
    if (data.analysis?.summary) {
        rows.push(["COMPREHENSIVE ANALYSIS SUMMARY"]);
        rows.push([]);
        rows.push(["AI-Generated Summary", data.analysis.summary]);
        rows.push([]);
    }

    // === READABILITY & ACCESSIBILITY METRICS ===
    if (data.analysis?.readability_metrics) {
        rows.push(["READABILITY ASSESSMENT"]);
        rows.push([]);
        const metrics = data.analysis.readability_metrics;
        rows.push(["Metric", "Value", "Interpretation", "Target Range"]);

        if (metrics.flesch_kincaid_grade) {
            const grade = metrics.flesch_kincaid_grade;
            rows.push([
                "Flesch-Kincaid Grade Level",
                grade.toFixed(1),
                getGradeInterpretation(grade),
                "8-12 (depending on audience)"
            ]);
        }

        if (metrics.avg_sentence_length) {
            const avgLength = metrics.avg_sentence_length;
            rows.push([
                "Average Sentence Length",
                `${avgLength.toFixed(1)} words`,
                getSentenceLengthInterpretation(avgLength),
                "15-20 words"
            ]);
        }

        if (metrics.complex_words_percentage) {
            const complex = metrics.complex_words_percentage;
            rows.push([
                "Complex Words Percentage",
                `${complex.toFixed(1)}%`,
                getComplexWordsInterpretation(complex),
                "< 15%"
            ]);
        }

        if (metrics.passive_voice_percentage) {
            const passive = metrics.passive_voice_percentage;
            rows.push([
                "Passive Voice Usage",
                `${passive.toFixed(1)}%`,
                getPassiveVoiceInterpretation(passive),
                "< 20%"
            ]);
        }
        rows.push([]);
    }

    // === ACCESSIBILITY ASSESSMENT ===
    if (data.analysis?.accessibility_assessment) {
        rows.push(["ACCESSIBILITY & INCLUSION ASSESSMENT"]);
        rows.push([]);
        const access = data.analysis.accessibility_assessment;
        rows.push(["Assessment Category", "Current Level", "Target Level", "Gap Analysis"]);

        if (access.wcag_compliance_level) {
            rows.push([
                "WCAG Compliance Level",
                access.wcag_compliance_level,
                "AA",
                access.wcag_compliance_level === "AA" ? "Compliant" : "Needs Improvement"
            ]);
        }

        if (access.screen_reader_compatibility) {
            rows.push([
                "Screen Reader Compatibility",
                access.screen_reader_compatibility,
                "High",
                access.screen_reader_compatibility === "high" ? "Excellent" : "Requires Enhancement"
            ]);
        }

        if (access.cognitive_accessibility) {
            rows.push([
                "Cognitive Accessibility",
                access.cognitive_accessibility,
                "High",
                access.cognitive_accessibility === "high" ? "Excellent" : "Requires Enhancement"
            ]);
        }

        if (access.multilingual_considerations) {
            rows.push(["Multilingual Support", access.multilingual_considerations, "Full Support", "Assessment Pending"]);
        }
        rows.push([]);
    }

    // === COMPLIANCE STATUS ===
    if (data.analysis?.compliance_status) {
        rows.push(["REGULATORY COMPLIANCE STATUS"]);
        rows.push([]);
        const compliance = data.analysis.compliance_status;
        rows.push(["Compliance Area", "Current Status", "Risk Level", "Action Required"]);

        if (compliance.regulatory_alignment) {
            const risk = compliance.regulatory_alignment === "full" ? "Low" :
                compliance.regulatory_alignment === "partial" ? "Medium" : "High";
            rows.push([
                "Regulatory Alignment",
                compliance.regulatory_alignment,
                risk,
                compliance.regulatory_alignment === "full" ? "Monitor" : "Immediate Action Required"
            ]);
        }

        if (compliance.transparency_score) {
            const score = compliance.transparency_score;
            const risk = score >= 80 ? "Low" : score >= 60 ? "Medium" : "High";
            rows.push([
                "Transparency Score",
                `${score}/100`,
                risk,
                score >= 80 ? "Maintain Standards" : "Improve Transparency"
            ]);
        }

        if (compliance.improvement_priority) {
            rows.push([
                "Overall Improvement Priority",
                compliance.improvement_priority,
                compliance.improvement_priority === "high" ? "Critical" : "Manageable",
                "See recommendations section"
            ]);
        }

        if (compliance.legal_risk_areas && compliance.legal_risk_areas.length > 0) {
            rows.push(["Legal Risk Areas", compliance.legal_risk_areas.join("; "), "Varies", "Legal Review Required"]);
        }
        rows.push([]);
    }

    // === DETAILED CATEGORY ANALYSIS ===
    rows.push(["COMPREHENSIVE CATEGORY ANALYSIS"]);
    rows.push([]);

    const categoryAnalysis = generateDetailedCategoryAnalysis(data.issues);
    rows.push([
        "Category",
        "Total Issues",
        "Critical",
        "High",
        "Medium",
        "Low",
        "Compliance Score",
        "Priority Level",
        "Primary Concerns",
        "Recommended Actions"
    ]);

    Object.entries(categoryAnalysis.categories).forEach(([category, stats]) => {
        const categoryInfo = complianceCategories[category] || complianceCategories.other;
        const priority = stats.critical > 0 ? "IMMEDIATE" :
            stats.high > 0 ? "HIGH" :
                stats.medium > 0 ? "MEDIUM" : "LOW";

        const actions = generateCategoryActions(category, stats);

        rows.push([
            `${categoryInfo.icon} ${categoryInfo.title}`,
            stats.total.toString(),
            stats.critical.toString(),
            stats.high.toString(),
            stats.medium.toString(),
            stats.low.toString(),
            `${stats.complianceScore}%`,
            priority,
            stats.topIssueTypes.slice(0, 3).join(", "),
            actions
        ]);
    });
    rows.push([]);

    // === SEVERITY IMPACT ANALYSIS ===
    rows.push(["SEVERITY IMPACT & TIMELINE ANALYSIS"]);
    rows.push([]);
    rows.push([
        "Severity Level",
        "Count",
        "Percentage",
        "Business Impact",
        "Recommended Timeline",
        "Resource Allocation",
        "Risk Level"
    ]);

    const totalIssues = data.issues.length;
    Object.entries(severityLevels).forEach(([severity, info]) => {
        const count = data.stats[severity as keyof typeof data.stats] || 0;
        const percentage = totalIssues > 0 ? ((count / totalIssues) * 100).toFixed(1) : '0';
        const impact = getBusinessImpact(severity);
        const resources = getResourceAllocation(severity, count);
        const risk = getRiskLevel(severity, count);

        rows.push([
            `${severity.toUpperCase()} - ${info.label}`,
            count.toString(),
            `${percentage}%`,
            impact,
            info.timeline,
            resources,
            risk
        ]);
    });
    rows.push([]);

    // === SECTION-BY-SECTION ANALYSIS ===
    rows.push(["DOCUMENT SECTION ANALYSIS"]);
    rows.push([]);

    const sectionAnalysis = generateAdvancedSectionAnalysis(data.issues);
    rows.push([
        "Document Section",
        "Total Issues",
        "Critical",
        "High",
        "Medium",
        "Low",
        "Section Score",
        "Primary Issue Types",
        "Readability Impact",
        "Compliance Risk",
        "Recommended Focus"
    ]);

    Object.entries(sectionAnalysis)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 20)
        .forEach(([section, stats]) => {
            const sectionScore = calculateSectionScore(stats);
            const readabilityImpact = assessReadabilityImpact(stats);
            const complianceRisk = assessComplianceRisk(stats);
            const focus = getRecommendedFocus(stats);

            rows.push([
                section,
                stats.total.toString(),
                stats.critical.toString(),
                stats.high.toString(),
                stats.medium.toString(),
                stats.low.toString(),
                `${sectionScore}%`,
                stats.topIssueTypes.slice(0, 2).join("; "),
                readabilityImpact,
                complianceRisk,
                focus
            ]);
        });
    rows.push([]);

    // === DETAILED ISSUES INVENTORY ===
    rows.push(["DETAILED ISSUES INVENTORY"]);
    rows.push([]);
    rows.push([
        "Issue ID",
        "Category",
        "Severity",
        "Status",
        "Document Section",
        "Issue Type",
        "Issue Description",
        "Original Text (Preview)",
        "Suggested Improvement (Preview)",
        "Character Position",
        "Estimated Fix Time",
        "Business Impact",
        "Technical Complexity"
    ]);

    data.issues
        .sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        })
        .forEach(issue => {
            const categoryInfo = complianceCategories[issue.type] || complianceCategories.other;
            const originalPreview = truncateText(issue.originalText, 150);
            const suggestionPreview = truncateText(issue.suggestedRewrite, 150);
            const position = issue.offsetStart && issue.offsetEnd
                ? `Chars ${issue.offsetStart}-${issue.offsetEnd}`
                : "Position not specified";
            const fixTime = estimateFixTime(issue);
            const businessImpact = assessIssueBusinessImpact(issue);
            const complexity = assessTechnicalComplexity(issue);

            rows.push([
                issue.id,
                `${categoryInfo.icon} ${categoryInfo.title}`,
                issue.severity.toUpperCase(),
                issue.status.toUpperCase(),
                issue.section,
                issue.type,
                issue.issueExplanation,
                originalPreview,
                suggestionPreview,
                position,
                fixTime,
                businessImpact,
                complexity
            ]);
        });
    rows.push([]);

    // === AI RECOMMENDATIONS ===
    if (data.analysis?.recommendations && data.analysis.recommendations.length > 0) {
        rows.push(["AI-POWERED STRATEGIC RECOMMENDATIONS"]);
        rows.push([]);
        rows.push([
            "Priority",
            "Recommendation Category",
            "Heading",
            "Impact Score",
            "Implementation Effort",
            "Expected Timeline",
            "Success Metrics",
            "Detailed Action Items"
        ]);

        data.analysis.recommendations
            .sort((a, b) => {
                const aImpact = typeof a === "object" ? (a.impact_score || 0) : 0;
                const bImpact = typeof b === "object" ? (b.impact_score || 0) : 0;
                return bImpact - aImpact;
            })
            .forEach((rec, index) => {
                if (typeof rec === "string") {
                    rows.push([
                        `${index + 1}`,
                        "General Improvement",
                        truncateText(rec, 80),
                        "N/A",
                        "Medium",
                        "2-4 weeks",
                        "Improved user satisfaction",
                        rec
                    ]);
                } else {
                    const timeline = getImplementationTimeline(rec.implementation_effort || "medium");
                    const metrics = getSuccessMetrics(rec.category || "general");

                    rows.push([
                        `${index + 1}`,
                        rec.category || "General",
                        rec.heading,
                        rec.impact_score?.toString() || "N/A",
                        rec.implementation_effort || "Medium",
                        timeline,
                        metrics,
                        rec.points.join("; ")
                    ]);
                }
            });
        rows.push([]);
    }

    // === REGULATORY COMPLIANCE DEEP DIVE ===
    rows.push(["REGULATORY COMPLIANCE ASSESSMENT"]);
    rows.push([]);

    const regulatoryAnalysis = analyzeRegulatoryCompliance(data);
    rows.push(["Compliance Area", "Current Status", "Gap Analysis", "Risk Assessment", "Action Plan"]);

    Object.entries(regulatoryAnalysis).forEach(([area, assessment]) => {
        rows.push([
            area,
            assessment.status,
            assessment.gaps,
            assessment.risk,
            assessment.actions
        ]);
    });
    rows.push([]);

    // === IMPLEMENTATION ROADMAP ===
    rows.push(["IMPLEMENTATION ROADMAP"]);
    rows.push([]);

    const roadmap = generateImplementationRoadmap(data);
    rows.push([
        "Phase",
        "Timeline",
        "Focus Areas",
        "Key Deliverables",
        "Success Criteria",
        "Resources Required",
        "Risk Mitigation"
    ]);

    roadmap.forEach((phase, index) => {
        rows.push([
            `Phase ${index + 1}: ${phase.name}`,
            phase.timeline,
            phase.focusAreas.join(", "),
            phase.deliverables.join("; "),
            phase.successCriteria,
            phase.resources,
            phase.riskMitigation
        ]);
    });
    rows.push([]);

    // === QUALITY METRICS DASHBOARD ===
    rows.push(["QUALITY METRICS DASHBOARD"]);
    rows.push([]);
    rows.push([
        "Metric Category",
        "Current Score",
        "Industry Benchmark",
        "Target Score",
        "Gap",
        "Improvement Strategy"
    ]);

    const qualityMetrics = calculateQualityMetrics(data);
    Object.entries(qualityMetrics).forEach(([category, metrics]) => {
        rows.push([
            category,
            `${metrics.current}%`,
            `${metrics.benchmark}%`,
            `${metrics.target}%`,
            `${metrics.gap}%`,
            metrics.strategy
        ]);
    });

    rows.push([]);
    rows.push(["Report Footer"]);
    rows.push(["Generated by", "Cleardoc Platform - Document Intelligence Engine"]);
    rows.push(["Report Version", "2.0 - Comprehensive Analysis"]);
    rows.push(["Analysis Confidence", "95%"]);
    rows.push(["Next Review Recommended", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()]);

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

    // Enhanced Color Palette
    const colors = {
        primary: rgb(0.2, 0.4, 0.8),
        secondary: rgb(0.3, 0.6, 0.9),
        accent: rgb(0.9, 0.4, 0.2),
        critical: rgb(0.9, 0.2, 0.2),
        high: rgb(0.95, 0.5, 0.1),
        medium: rgb(0.95, 0.8, 0.2),
        low: rgb(0.2, 0.7, 0.3),
        success: rgb(0.1, 0.7, 0.4),
        warning: rgb(0.9, 0.6, 0.1),
        text: rgb(0.2, 0.2, 0.2),
        textLight: rgb(0.4, 0.4, 0.4),
        background: rgb(0.98, 0.98, 0.98),
        cardBackground: rgb(1, 1, 1),
        lightGray: rgb(0.9, 0.9, 0.9),
        mediumGray: rgb(0.7, 0.7, 0.7),
        darkGray: rgb(0.4, 0.4, 0.4),
        border: rgb(0.85, 0.85, 0.85)
    };

    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // === COVER PAGE ===
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 60;

    // Header with gradient effect simulation
    page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: colors.primary });
    page.drawRectangle({ x: 0, y: height - 90, width, height: 30, color: colors.secondary, opacity: 0.8 });

    // Main Title
    page.drawText("CLEARDOC PLATFORM", {
        x: 50, y: height - 45, size: 24, font: helveticaBold, color: rgb(1, 1, 1)
    });
    page.drawText("Document Comprehensibility & Compliance Report", {
        x: 50, y: height - 70, size: 16, font: helvetica, color: rgb(1, 1, 1)
    });

    // Score Badge
    const scoreColor = comprehensibilityScore >= 85 ? colors.success :
        comprehensibilityScore >= 70 ? colors.medium :
            comprehensibilityScore >= 50 ? colors.warning : colors.critical;

    const badgeX = width - 200;
    const badgeY = height - 140;

    // Score circle
    page.drawCircle({ x: badgeX + 60, y: badgeY + 30, size: 45, color: scoreColor });
    page.drawCircle({ x: badgeX + 60, y: badgeY + 30, size: 40, color: colors.cardBackground });

    page.drawText(`${comprehensibilityScore}`, {
        x: badgeX + 45, y: badgeY + 35, size: 24, font: helveticaBold, color: scoreColor
    });
    page.drawText("SCORE", {
        x: badgeX + 35, y: badgeY + 15, size: 10, font: helvetica, color: colors.textLight
    });

    // Document Information Card
    // Add a decorative header line
    page.drawLine({
        start: { x: 40, y: height - 160 },
        end: { x: width - 40, y: height - 160 },
        color: colors.primary,
        thickness: 3
    });

    const cardY = height - 200;
    // Add subtle shadow effect
    page.drawRectangle({ x: 42, y: cardY - 152, width: width - 80, height: 140, color: rgb(0, 0, 0), opacity: 0.1 });
    page.drawRectangle({ x: 40, y: cardY - 150, width: width - 80, height: 140, color: colors.cardBackground });
    page.drawRectangle({ x: 40, y: cardY - 150, width: width - 80, height: 140, borderColor: colors.border, borderWidth: 1 });

    // Add section indicator
    page.drawRectangle({ x: 40, y: cardY - 150, width: 5, height: 140, color: colors.primary });
    page.drawText("Document Information", { x: 60, y: cardY - 20, size: 14, font: helveticaBold, color: colors.primary });

    const docInfo = [
        [`Document: ${data.name}`, `Language: ${data.language}`],
        [`Type: ${formatDocumentType(data.documentType)}`, `Audience: ${data.targetAudience}`],
        [`Created: ${new Date(data.createdAt).toLocaleDateString()}`, `Jurisdiction: ${data.jurisdiction}`],
        [`Status: ${data.status.toUpperCase()}`, `Regulations: ${truncateText(data.regulations, 25)}`],
    ];

    docInfo.forEach((row, i) => {
        const yPos = cardY - 45 - (i * 20);
        page.drawText(row[0], { x: 70, y: yPos, size: 11, font: helvetica, color: colors.text });
        page.drawText(row[1], { x: 320, y: yPos, size: 11, font: helvetica, color: colors.text });
    });

    // Enhanced Statistics Cards with improved spacing
    const statsY = height - 400; // Increased spacing from previous section
    const stats = [
        { label: "Critical", value: data.stats.critical, color: colors.critical },
        { label: "High", value: data.stats.high, color: colors.high },
        { label: "Medium", value: data.stats.medium, color: colors.medium, },
        { label: "Low", value: data.stats.low, color: colors.low, },
    ];

    // Add section header
    page.drawText("Issue Statistics", { x: 40, y: statsY + 30, size: 16, font: helveticaBold, color: colors.primary });
    page.drawLine({
        start: { x: 40, y: statsY + 20 },
        end: { x: width - 40, y: statsY + 20 },
        color: colors.border,
        thickness: 1
    });

    const cardWidth = (width - 160) / stats.length; // Increased spacing between cards
    stats.forEach((stat, i) => {
        const x = 60 + i * (cardWidth + 10);

        // Card background with shadow effect
        page.drawRectangle({ x: x + 2, y: statsY - 42, width: cardWidth, height: 50, color: colors.lightGray, opacity: 0.3 });
        page.drawRectangle({ x, y: statsY - 40, width: cardWidth, height: 50, color: colors.cardBackground });
        page.drawRectangle({ x, y: statsY - 40, width: cardWidth, height: 50, borderColor: stat.color, borderWidth: 2 });

        // Icon and content
        // page.drawCircle({ x: x + 18, y: statsY - 10, size: 12, color: stat.color });
        // page.drawText(stat.icon, { x: x + 14, y: statsY - 15, size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
        page.drawText(stat.label, { x: x + 15, y: statsY - 15, size: 12, font: helveticaBold, color: stat.color });
        page.drawText(`${stat.value}`, { x: x + cardWidth - 35, y: statsY - 15, size: 20, font: helveticaBold, color: stat.color });

        // Progress bar
        const progress = stat.value / Math.max(data.stats.total, 1);
        page.drawRectangle({ x: x + 10, y: statsY - 35, width: cardWidth - 20, height: 4, color: colors.lightGray });
        page.drawRectangle({ x: x + 10, y: statsY - 35, width: (cardWidth - 20) * progress, height: 4, color: stat.color });
    });

    // Key Insights Section with improved design
    const insightsY = height - 520; // Increased spacing

    // Section header with decorative elements
    page.drawText("Key Insights", { x: 40, y: insightsY + 30, size: 16, font: helveticaBold, color: colors.primary });
    page.drawLine({
        start: { x: 40, y: insightsY + 20 },
        end: { x: width - 40, y: insightsY + 20 },
        color: colors.border,
        thickness: 1
    });

    // Main insights box with shadow effect
    page.drawRectangle({ x: 42, y: insightsY - 82, width: width - 80, height: 90, color: rgb(0, 0, 0), opacity: 0.1 });
    page.drawRectangle({ x: 40, y: insightsY - 80, width: width - 80, height: 90, color: colors.background });
    page.drawRectangle({ x: 40, y: insightsY - 80, width: width - 80, height: 90, borderColor: colors.border, borderWidth: 1 });

    // Add accent line
    page.drawRectangle({ x: 40, y: insightsY - 80, width: 5, height: 90, color: colors.primary });

    const insights = generateKeyInsights(data);
    insights.slice(0, 3).forEach((insight, i) => {
        page.drawText(`• ${insight}`, {
            x: 70,
            y: insightsY - 35 - (i * 15),
            size: 10,
            font: helvetica,
            color: colors.text,
            maxWidth: width - 140
        });
    });

    // === PAGE 2: ANALYSIS OVERVIEW ===
    page = pdfDoc.addPage();
    y = height - 60;

    drawPageHeader(page, "Analysis Overview", colors, helveticaBold, width);
    y -= 80;

    // Summary Section
    if (data.analysis?.summary) {
        y = drawSection(page, "Executive Summary", data.analysis.summary, y, colors, helvetica, helveticaBold, width);
    }

    // Readability Metrics
    if (data.analysis?.readability_metrics) {
        y = drawReadabilityMetrics(page, data.analysis.readability_metrics, y, colors, helvetica, helveticaBold, width);
    }

    // Accessibility Assessment
    if (data.analysis?.accessibility_assessment) {
        y = drawAccessibilityAssessment(page, data.analysis.accessibility_assessment, y, colors, helvetica, helveticaBold, width);
    }

    // Compliance Status
    if (data.analysis?.compliance_status) {
        y = drawComplianceStatus(page, data.analysis.compliance_status, y, colors, helvetica, helveticaBold, width);
    }

    // === ISSUES PAGES (Multiple pages for detailed issues) ===
    let issueIdx = 0;
    const issuesPerPage = 6;

    while (issueIdx < data.issues.length) {
        page = pdfDoc.addPage();
        y = height - 60;

        const pageNum = Math.floor(issueIdx / issuesPerPage) + 1;
        drawPageHeader(page, `Detailed Issues (Page ${pageNum})`, colors, helveticaBold, width);
        y -= 80;

        for (let i = 0; i < issuesPerPage && issueIdx < data.issues.length; i++, issueIdx++) {
            const newY = drawIssueCard(page, data.issues[issueIdx], y, colors, helvetica, helveticaBold, width);
            if (newY === -1) break; // Start new page if we're running out of space
            y = newY;
        }
    }

    // No recommendations or roadmap pages

    // Add professional footer to all pages
    pdfDoc.getPages().forEach((p, i) => {
        drawFooter(p, i + 1, pdfDoc.getPages().length, colors, helvetica);
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

// Utility function to generate a comprehensive text report
export function generateTextReport(data: ComprehensibilityReportData): string {
    const comprehensibilityScore = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);
    const categoryAnalysis = generateDetailedCategoryAnalysis(data.issues);

    return `
+------------------------------------------------------------------------------+
|                    CLEARDOC PLATFORM - COMPREHENSIVE REPORT                    |
|                   Document Comprehensibility & Compliance Analysis             |
+------------------------------------------------------------------------------+

DOCUMENT INFORMATION
===================
Document Name: ${data.name}
Document Type: ${formatDocumentType(data.documentType)}
Language: ${data.language}
Target Audience: ${data.targetAudience}
Jurisdiction: ${data.jurisdiction}
Applicable Regulations: ${data.regulations}
Current Status: ${data.status.toUpperCase()}

EXECUTIVE SUMMARY
===================
Overall Comprehensibility Score: ${comprehensibilityScore}% ${getScoreEmoji(comprehensibilityScore)}
Score Interpretation: ${getScoreInterpretation(comprehensibilityScore)}

Issues Overview:
• Total Issues Identified: ${data.stats.total}
• Critical (Immediate Action): ${data.stats.critical}
• High Priority: ${data.stats.high}
• Medium Priority: ${data.stats.medium}
• Low Priority: ${data.stats.low}

Progress Tracking:
• Issues Resolved: ${data.stats.closedCount}
• Issues Open: ${data.stats.openCount}
• Completion Rate: ${((data.stats.closedCount / Math.max(data.stats.total, 1)) * 100).toFixed(1)}%

${data.analysis?.summary ? `
ANALYSIS SUMMARY
==================
${data.analysis.summary}
` : ''}

${data.analysis?.readability_metrics ? `
READABILITY ASSESSMENT
===================
${data.analysis.readability_metrics.flesch_kincaid_grade ? `• Reading Level: ${data.analysis.readability_metrics.flesch_kincaid_grade.toFixed(1)} (${getGradeInterpretation(data.analysis.readability_metrics.flesch_kincaid_grade)})` : ''}
${data.analysis.readability_metrics.avg_sentence_length ? `• Average Sentence Length: ${data.analysis.readability_metrics.avg_sentence_length.toFixed(1)} words (${getSentenceLengthInterpretation(data.analysis.readability_metrics.avg_sentence_length)})` : ''}
${data.analysis.readability_metrics.complex_words_percentage ? `• Complex Words: ${data.analysis.readability_metrics.complex_words_percentage.toFixed(1)}% (${getComplexWordsInterpretation(data.analysis.readability_metrics.complex_words_percentage)})` : ''}
${data.analysis.readability_metrics.passive_voice_percentage ? `• Passive Voice: ${data.analysis.readability_metrics.passive_voice_percentage.toFixed(1)}% (${getPassiveVoiceInterpretation(data.analysis.readability_metrics.passive_voice_percentage)})` : ''}
` : ''}

CATEGORY ANALYSIS
=================
${Object.entries(categoryAnalysis.categories)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([category, stats]) => {
                const categoryInfo = complianceCategories[category] || complianceCategories.other;
                const priority = stats.critical > 0 ? "IMMEDIATE" :
                    stats.high > 0 ? "HIGH" :
                        stats.medium > 0 ? "MEDIUM" : "LOW";

                return `
${categoryInfo.icon} ${categoryInfo.title}
   Issues: ${stats.total} | Score: ${stats.complianceScore}% | Priority: ${priority}
   Distribution: Critical(${stats.critical}) High(${stats.high}) Medium(${stats.medium}) Low(${stats.low})
   Focus Areas: ${stats.topIssueTypes.slice(0, 3).join(", ")}`;
            }).join('\n')}

DETAILED ISSUES
===============
${data.issues
            .sort((a, b) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                    (severityOrder[a.severity as keyof typeof severityOrder] || 0);
            })
            .slice(0, 20) // Limit to top 20 for text report
            .map((issue, index) => {
                const categoryInfo = complianceCategories[issue.type] || complianceCategories.other;
                const severityInfo = severityLevels[issue.severity as keyof typeof severityLevels];

                return `
${index + 1}. ${categoryInfo.icon} ${categoryInfo.title} - ${severityInfo?.label || issue.severity.toUpperCase()}
   Section: ${issue.section}
   Status: ${issue.status.toUpperCase()}
   
   Issue: ${issue.issueExplanation}
   
   Original Text: "${truncateText(issue.originalText, 200)}"
   
   Suggested Improvement: "${truncateText(issue.suggestedRewrite, 200)}"
   
   Timeline: ${severityInfo?.timeline || "As needed"}
   ───────────────────────────────────────────────────────────────────────`;
            }).join('\n')}

${data.analysis?.recommendations && data.analysis.recommendations.length > 0 ? `
STRATEGIC RECOMMENDATIONS
═══════════════════════════
${data.analysis.recommendations.slice(0, 10).map((rec, index) => {
                if (typeof rec === "string") {
                    return `${index + 1}. ${rec}`;
                } else {
                    return `
${index + 1}. ${rec.heading} (${rec.priority?.toUpperCase() || 'MEDIUM'} PRIORITY)
   Category: ${rec.category || 'General'}
   Impact Score: ${rec.impact_score || 'N/A'}
   Implementation Effort: ${rec.implementation_effort || 'Medium'}
   
   Action Items:
   ${rec.points.map(point => `   • ${point}`).join('\n')}`;
                }
            }).join('\n')}
` : ''}

QUALITY METRICS
==============
${Object.entries(calculateQualityMetrics(data)).map(([category, metrics]) =>
                `${category}: ${metrics.current}% (Target: ${metrics.target}%, Gap: ${metrics.gap}%)`
            ).join('\n')}

NEXT STEPS
==========
${generateImplementationRoadmap(data).slice(0, 3).map((phase, index) =>
                `Phase ${index + 1}: ${phase.name} (${phase.timeline})
   Focus: ${phase.focusAreas.join(", ")}
   Key Deliverables: ${phase.deliverables.slice(0, 2).join(", ")}`
            ).join('\n\n')}

-------------------------------------------------------------------------------
Generated by Cleardoc Platform | ${new Date().toLocaleString()}
Report Version: 2.0 | Analysis Confidence: 95%
Next Review Recommended: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
-------------------------------------------------------------------------------
`.trim();
}

// ===== HELPER FUNCTIONS =====

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

function truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
}

function getScoreInterpretation(score: number): string {
    if (score >= 90) return "Excellent - Document meets highest standards";
    if (score >= 80) return "Good - Minor improvements recommended";
    if (score >= 70) return "Satisfactory - Several improvements needed";
    if (score >= 60) return "Below Average - Significant improvements required";
    return "Poor - Major overhaul needed";
}

function getScoreEmoji(score: number): string {
    if (score >= 90) return "***";
    if (score >= 80) return "**";
    if (score >= 70) return "*";
    if (score >= 60) return "-";
    return "!";
}

function getGradeInterpretation(grade: number): string {
    if (grade <= 8) return "Easy to read";
    if (grade <= 12) return "Appropriate for general audience";
    if (grade <= 16) return "College level";
    return "Advanced education required";
}

function getSentenceLengthInterpretation(length: number): string {
    if (length <= 15) return "Excellent - Easy to follow";
    if (length <= 20) return "Good - Generally readable";
    if (length <= 25) return "Fair - Could be shorter";
    return "Poor - Too complex";
}

function getComplexWordsInterpretation(percentage: number): string {
    if (percentage <= 10) return "Excellent - Very accessible";
    if (percentage <= 15) return "Good - Reasonably accessible";
    if (percentage <= 20) return "Fair - Some simplification needed";
    return "Poor - Significant simplification required";
}

function getPassiveVoiceInterpretation(percentage: number): string {
    if (percentage <= 10) return "Excellent - Mostly active voice";
    if (percentage <= 20) return "Good - Acceptable level";
    if (percentage <= 30) return "Fair - Consider more active voice";
    return "Poor - Too much passive voice";
}

function generateDetailedCategoryAnalysis(issues: ComprehensibilityReportData['issues']) {
    const categories: Record<string, any> = {};

    // Initialize all categories
    Object.keys(complianceCategories).forEach(key => {
        categories[key] = {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            complianceScore: 100,
            topIssueTypes: [] as string[]
        };
    });

    issues.forEach(issue => {
        const category = categories[issue.type] || categories.other;
        category.total++;
        category[issue.severity as keyof Omit<typeof category, 'total' | 'complianceScore' | 'topIssueTypes'>]++;

        if (!category.topIssueTypes.includes(issue.type)) {
            category.topIssueTypes.push(issue.type);
        }
    });

    // Calculate compliance scores
    Object.keys(categories).forEach(key => {
        const category = categories[key];
        const deduction = category.critical * 25 + category.high * 15 + category.medium * 8 + category.low * 3;
        category.complianceScore = Math.max(0, 100 - deduction);
    });

    return { categories };
}

function generateAdvancedSectionAnalysis(issues: ComprehensibilityReportData['issues']) {
    const sectionStats: Record<string, any> = {};

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

function calculateSectionScore(stats: any): number {
    const deduction = stats.critical * 20 + stats.high * 12 + stats.medium * 6 + stats.low * 2;
    return Math.max(0, 100 - deduction);
}

function assessReadabilityImpact(stats: any): string {
    if (stats.critical > 0) return "High Impact";
    if (stats.high > 0) return "Medium Impact";
    if (stats.medium > 0) return "Low Impact";
    return "Minimal Impact";
}

function assessComplianceRisk(stats: any): string {
    if (stats.critical > 0) return "High Risk";
    if (stats.high > 1) return "Medium Risk";
    if (stats.medium > 2) return "Low Risk";
    return "Minimal Risk";
}

function getRecommendedFocus(stats: any): string {
    if (stats.critical > 0) return "Immediate attention required";
    if (stats.high > 0) return "Priority for next review";
    if (stats.medium > 0) return "Include in next update";
    return "Monitor for future";
}

function generateCategoryActions(category: string, stats: any): string {
    const categoryInfo = complianceCategories[category] || complianceCategories.other;

    if (stats.critical > 0) return "Legal review & immediate fixes";
    if (stats.high > 0) return "Editorial review & revisions";
    if (stats.medium > 0) return "Style guide compliance";
    return "Quality assurance check";
}

function getBusinessImpact(severity: string): string {
    const impacts = {
        critical: "Legal liability, compliance violations, user safety",
        high: "User confusion, reduced trust, potential complaints",
        medium: "Suboptimal user experience, minor comprehension issues",
        low: "Minor polish improvements, enhanced professionalism"
    };
    return impacts[severity as keyof typeof impacts] || "General improvement";
}

function getResourceAllocation(severity: string, count: number): string {
    if (count === 0) return "None required";

    const allocations = {
        critical: "Legal team + senior writers",
        high: "Senior content team",
        medium: "Content team + review",
        low: "Junior writers + QA"
    };
    return allocations[severity as keyof typeof allocations] || "Standard team";
}

function getRiskLevel(severity: string, count: number): string {
    if (count === 0) return "No Risk";

    const risks = {
        critical: count > 2 ? "EXTREME" : "HIGH",
        high: count > 5 ? "HIGH" : "MEDIUM",
        medium: count > 10 ? "MEDIUM" : "LOW",
        low: "MINIMAL"
    };
    return risks[severity as keyof typeof risks] || "UNKNOWN";
}

function estimateFixTime(issue: any): string {
    const timeMap = {
        critical: "2-4 hours",
        high: "1-2 hours",
        medium: "30-60 minutes",
        low: "15-30 minutes"
    };
    return timeMap[issue.severity as keyof typeof timeMap] || "30 minutes";
}

function assessIssueBusinessImpact(issue: any): string {
    if (issue.type === "legal" || issue.type === "compliance") return "High - Legal/Compliance";
    if (issue.type === "clarity") return "High - User Understanding";
    if (issue.type === "accessibility") return "Medium - Inclusion";
    return "Low - Quality Enhancement";
}

function assessTechnicalComplexity(issue: any): string {
    if (issue.type === "structure") return "High - Requires restructuring";
    if (issue.type === "legal") return "Medium - Subject matter expertise";
    return "Low - Editorial changes";
}

function getImplementationTimeline(effort: string): string {
    const timelines = {
        low: "1-2 weeks",
        medium: "2-4 weeks",
        high: "4-8 weeks"
    };
    return timelines[effort as keyof typeof timelines] || "2-4 weeks";
}

function getSuccessMetrics(category: string): string {
    const metrics = {
        clarity: "User comprehension scores",
        legal: "Compliance audit results",
        structure: "Navigation analytics",
        accessibility: "WCAG compliance level"
    };
    return metrics[category as keyof typeof metrics] || "Quality score improvement";
}

function analyzeRegulatoryCompliance(data: ComprehensibilityReportData) {
    const analysis: Record<string, any> = {};

    const regulatoryIssues = data.issues.filter(i => i.type === 'legal' || i.type === 'compliance');

    analysis["Legal Language Requirements"] = {
        status: regulatoryIssues.length === 0 ? "Compliant" : "Non-compliant",
        gaps: regulatoryIssues.length > 0 ? `${regulatoryIssues.length} issues found` : "No gaps identified",
        risk: regulatoryIssues.filter(i => i.severity === 'critical').length > 0 ? "High" : "Low",
        actions: regulatoryIssues.length > 0 ? "Legal review required" : "Continue monitoring"
    };

    analysis["Disclosure Requirements"] = {
        status: data.analysis?.compliance_status?.transparency_score ?
            (data.analysis.compliance_status.transparency_score >= 80 ? "Compliant" : "Partial") : "Unknown",
        gaps: "Transparency analysis needed",
        risk: "Medium",
        actions: "Review disclosure completeness"
    };

    return analysis;
}

function generateImplementationRoadmap(data: ComprehensibilityReportData) {
    const criticalIssues = data.issues.filter(i => i.severity === 'critical');
    const highIssues = data.issues.filter(i => i.severity === 'high');
    const mediumIssues = data.issues.filter(i => i.severity === 'medium');
    const lowIssues = data.issues.filter(i => i.severity === 'low');

    const roadmap = [];

    if (criticalIssues.length > 0) {
        roadmap.push({
            name: "Critical Issues Resolution",
            timeline: "1-2 weeks",
            focusAreas: ["Legal compliance", "Critical clarity issues"],
            deliverables: ["Legal review completion", "Critical fixes implementation"],
            successCriteria: "All critical issues resolved",
            resources: "Legal team + senior content team",
            riskMitigation: "Daily progress reviews"
        });
    }

    if (highIssues.length > 0) {
        roadmap.push({
            name: "High Priority Improvements",
            timeline: "2-4 weeks",
            focusAreas: ["Content clarity", "User experience"],
            deliverables: ["Content revisions", "Style guide updates"],
            successCriteria: "90% of high issues resolved",
            resources: "Content team + UX review",
            riskMitigation: "Weekly stakeholder reviews"
        });
    }

    if (mediumIssues.length > 0 || lowIssues.length > 0) {
        roadmap.push({
            name: "Quality Enhancement",
            timeline: "4-8 weeks",
            focusAreas: ["Overall polish", "Best practices"],
            deliverables: ["Comprehensive review", "Quality improvements"],
            successCriteria: "Overall score >85%",
            resources: "Editorial team",
            riskMitigation: "Phased implementation"
        });
    }

    roadmap.push({
        name: "Ongoing Monitoring",
        timeline: "Continuous",
        focusAreas: ["Quality maintenance", "Regular reviews"],
        deliverables: ["Monthly reports", "Compliance monitoring"],
        successCriteria: "Sustained high quality",
        resources: "QA team",
        riskMitigation: "Automated monitoring tools"
    });

    return roadmap;
}

function calculateQualityMetrics(data: ComprehensibilityReportData) {
    const score = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);

    return {
        "Overall Comprehensibility": {
            current: score,
            benchmark: 75,
            target: 90,
            gap: Math.max(0, 90 - score),
            strategy: score < 90 ? "Focus on critical and high priority issues" : "Maintain current standards"
        },
        "Legal Compliance": {
            current: data.issues.filter(i => i.type === 'legal').length === 0 ? 100 : 70,
            benchmark: 95,
            target: 100,
            gap: data.issues.filter(i => i.type === 'legal').length > 0 ? 30 : 0,
            strategy: "Legal review and compliance verification"
        },
        "Accessibility": {
            current: data.analysis?.accessibility_assessment?.wcag_compliance_level === "AA" ? 100 : 75,
            benchmark: 85,
            target: 100,
            gap: data.analysis?.accessibility_assessment?.wcag_compliance_level === "AA" ? 0 : 25,
            strategy: "WCAG 2.1 AA compliance implementation"
        },
        "Readability": {
            current: data.analysis?.readability_metrics?.flesch_kincaid_grade ?
                (data.analysis.readability_metrics.flesch_kincaid_grade <= 12 ? 90 : 70) : 80,
            benchmark: 85,
            target: 90,
            gap: 10,
            strategy: "Simplify language and sentence structure"
        }
    };
}

function generateKeyInsights(data: ComprehensibilityReportData): string[] {
    const insights = [];
    const score = data.comprehensibilityScore || calculateComprehensibilityScore(data.issues);

    if (data.stats.critical > 0) {
        insights.push(`${data.stats.critical} critical issues require immediate attention to ensure compliance`);
    }

    if (score >= 85) {
        insights.push("Document meets high comprehensibility standards with minor improvements needed");
    } else if (score >= 70) {
        insights.push("Document has good foundation but needs focused improvements in key areas");
    } else {
        insights.push("Document requires significant improvements to meet accessibility standards");
    }

    const topCategory = Object.entries(generateDetailedCategoryAnalysis(data.issues).categories)
        .sort(([, a], [, b]) => b.total - a.total)[0];

    if (topCategory && topCategory[1].total > 0) {
        const categoryInfo = complianceCategories[topCategory[0]] || complianceCategories.other;
        insights.push(`${categoryInfo.title} shows the most issues and should be prioritized`);
    }

    if (data.analysis?.readability_metrics?.flesch_kincaid_grade) {
        const grade = data.analysis.readability_metrics.flesch_kincaid_grade;
        if (grade > 12) {
            insights.push(`Reading level (${grade.toFixed(1)}) may be too advanced for target audience`);
        }
    }

    return insights;
}

// PDF Drawing Helper Functions
function drawPageHeader(page: any, title: string, colors: any, font: any, width: number) {
    const height = page.getSize().height;

    // Main header background with gradient effect
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: colors.primary });
    page.drawRectangle({ x: 0, y: height - 80, width, height: 20, color: colors.primary, opacity: 0.2 });

    // Add decorative line
    page.drawLine({
        start: { x: 40, y: height - 80 },
        end: { x: width - 40, y: height - 80 },
        color: rgb(1, 1, 1),
        opacity: 0.3,
        thickness: 2
    });

    // Title with shadow effect
    page.drawText(title, {
        x: 52,
        y: height - 45,
        size: 18,
        font,
        color: rgb(0.1, 0.1, 0.1),
        opacity: 0.3
    });
    page.drawText(title, {
        x: 50,
        y: height - 43,
        size: 18,
        font,
        color: rgb(1, 1, 1)
    });

    // Add timestamp
    page.drawText(new Date().toLocaleDateString(), {
        x: width - 150,
        y: height - 43,
        size: 10,
        font,
        color: rgb(1, 1, 1),
        opacity: 0.8
    });
}

function drawSection(page: any, title: string, content: string, y: number, colors: any, font: any, boldFont: any, width: number): number {
    const sectionHeight = Math.min(100, content.length / 8 + 40);

    page.drawRectangle({ x: 40, y: y - sectionHeight, width: width - 80, height: sectionHeight, color: colors.background });
    page.drawRectangle({ x: 40, y: y - sectionHeight, width: width - 80, height: sectionHeight, borderColor: colors.border, borderWidth: 1 });

    page.drawText(title, { x: 60, y: y - 25, size: 14, font: boldFont, color: colors.primary });

    // Split content into lines to fit width
    const words = content.split(' ');
    const lines = [];
    let currentLine = '';
    const maxWidth = width - 120;

    words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (testLine.length * 6 > maxWidth) { // Rough character width estimation
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    if (currentLine) lines.push(currentLine);

    lines.slice(0, 4).forEach((line, i) => {
        page.drawText(line, {
            x: 60,
            y: y - 45 - (i * 12),
            size: 10,
            font,
            color: colors.text,
            maxWidth: maxWidth
        });
    });

    return y - sectionHeight - 20;
}

function drawReadabilityMetrics(page: any, metrics: any, y: number, colors: any, font: any, boldFont: any, width: number): number {
    const metricsHeight = 80;

    page.drawRectangle({ x: 40, y: y - metricsHeight, width: width - 80, height: metricsHeight, color: colors.background });
    page.drawRectangle({ x: 40, y: y - metricsHeight, width: width - 80, height: metricsHeight, borderColor: colors.border, borderWidth: 1 });

    page.drawText("Readability Metrics", { x: 60, y: y - 25, size: 14, font: boldFont, color: colors.primary });

    const metricsList = [];
    if (metrics.flesch_kincaid_grade) {
        metricsList.push(`Reading Level: ${metrics.flesch_kincaid_grade.toFixed(1)} (${getGradeInterpretation(metrics.flesch_kincaid_grade)})`);
    }
    if (metrics.avg_sentence_length) {
        metricsList.push(`Sentence Length: ${metrics.avg_sentence_length.toFixed(1)} words (${getSentenceLengthInterpretation(metrics.avg_sentence_length)})`);
    }
    if (metrics.complex_words_percentage) {
        metricsList.push(`Complex Words: ${metrics.complex_words_percentage.toFixed(1)}% (${getComplexWordsInterpretation(metrics.complex_words_percentage)})`);
    }

    metricsList.slice(0, 3).forEach((metric, i) => {
        page.drawText(`• ${metric}`, { x: 70, y: y - 45 - (i * 12), size: 10, font, color: colors.text });
    });

    return y - metricsHeight - 20;
}

function drawAccessibilityAssessment(page: any, assessment: any, y: number, colors: any, font: any, boldFont: any, width: number): number {
    const assessmentHeight = 80;

    page.drawRectangle({ x: 40, y: y - assessmentHeight, width: width - 80, height: assessmentHeight, color: colors.background });
    page.drawRectangle({ x: 40, y: y - assessmentHeight, width: width - 80, height: assessmentHeight, borderColor: colors.border, borderWidth: 1 });

    page.drawText(" Accessibility Assessment", { x: 60, y: y - 25, size: 14, font: boldFont, color: colors.primary });

    let lineY = y - 45;
    if (assessment.wcag_compliance_level) {
        page.drawText(`• WCAG Compliance: ${assessment.wcag_compliance_level}`, { x: 70, y: lineY, size: 10, font, color: colors.text });
        lineY -= 12;
    }
    if (assessment.screen_reader_compatibility) {
        page.drawText(`• Screen Reader: ${assessment.screen_reader_compatibility}`, { x: 70, y: lineY, size: 10, font, color: colors.text });
        lineY -= 12;
    }
    if (assessment.cognitive_accessibility) {
        page.drawText(`• Cognitive Access: ${assessment.cognitive_accessibility}`, { x: 70, y: lineY, size: 10, font, color: colors.text });
    }

    return y - assessmentHeight - 20;
}

function drawComplianceStatus(page: any, compliance: any, y: number, colors: any, font: any, boldFont: any, width: number): number {
    const complianceHeight = 80;

    page.drawRectangle({ x: 40, y: y - complianceHeight, width: width - 80, height: complianceHeight, color: colors.background });
    page.drawRectangle({ x: 40, y: y - complianceHeight, width: width - 80, height: complianceHeight, borderColor: colors.border, borderWidth: 1 });

    page.drawText("Compliance Status", { x: 60, y: y - 25, size: 14, font: boldFont, color: colors.primary });

    let lineY = y - 45;
    if (compliance.regulatory_alignment) {
        page.drawText(`• Regulatory Alignment: ${compliance.regulatory_alignment}`, { x: 70, y: lineY, size: 10, font, color: colors.text });
        lineY -= 12;
    }
    if (compliance.transparency_score) {
        page.drawText(`• Transparency Score: ${compliance.transparency_score}/100`, { x: 70, y: lineY, size: 10, font, color: colors.text });
        lineY -= 12;
    }
    if (compliance.improvement_priority) {
        page.drawText(`• Priority Level: ${compliance.improvement_priority}`, { x: 70, y: lineY, size: 10, font, color: colors.text });
    }

    return y - complianceHeight - 20;
}

function drawCategoryAnalysis(page: any, analysis: any, y: number, colors: any, font: any, boldFont: any, width: number): number {
    const categories = Object.entries(analysis.categories)
        .sort(([, a], [, b]) => (b as any).total - (a as any).total)
        .slice(0, 6);

    const categoryHeight = 40;
    const totalHeight = categories.length * (categoryHeight + 10) + 40;

    page.drawRectangle({ x: 40, y: y - totalHeight, width: width - 80, height: totalHeight, color: colors.background });
    page.drawRectangle({ x: 40, y: y - totalHeight, width: width - 80, height: totalHeight, borderColor: colors.border, borderWidth: 1 });

    // page.drawText("Category Analysis", { x: 60, y: y - 25, size: 14, font: boldFont, color: colors.primary });

    // categories.forEach(([category, stats], i) => {
    //     const categoryInfo = complianceCategories[category] || complianceCategories.other;
    //     const cardY = y - 50 - (i * (categoryHeight + 10));

    //     // Category card
    //     const cardColor = (stats as any).critical > 0 ? colors.critical :
    //         (stats as any).high > 0 ? colors.high :
    //             (stats as any).medium > 0 ? colors.medium : colors.low;

    //     page.drawRectangle({ x: 60, y: cardY - categoryHeight, width: width - 120, height: categoryHeight, color: cardColor, opacity: 0.1 });
    //     page.drawRectangle({ x: 60, y: cardY - categoryHeight, width: width - 120, height: categoryHeight, borderColor: cardColor, borderWidth: 1 });

    //     page.drawText(`${categoryInfo.icon} ${categoryInfo.title}`, { x: 75, y: cardY - 15, size: 11, font: boldFont, color: cardColor });
    //     page.drawText(`${(stats as any).total} issues | Score: ${(stats as any).complianceScore}%`, { x: 75, y: cardY - 30, size: 9, font, color: colors.text });

    //     // Progress bar
    //     const progressWidth = ((stats as any).complianceScore / 100) * 100;
    //     page.drawRectangle({ x: width - 180, y: cardY - 25, width: 100, height: 6, color: colors.lightGray });
    //     page.drawRectangle({ x: width - 180, y: cardY - 25, width: progressWidth, height: 6, color: cardColor });
    // });

    return y - totalHeight - 20;
}

function drawIssueCard(page: any, issue: any, y: number, colors: any, font: any, boldFont: any, width: number): number {
    const issueHeight = 90;

    // Check if we have enough space
    if (y < 100) {
        return -1; // Signal that we need a new page
    }

    const severityInfo = severityLevels[issue.severity as keyof typeof severityLevels];
    const categoryInfo = complianceCategories[issue.type] || complianceCategories.other;

    const cardColor = severityInfo ? rgb(
        parseInt(severityInfo.color.slice(1, 3), 16) / 255,
        parseInt(severityInfo.color.slice(3, 5), 16) / 255,
        parseInt(severityInfo.color.slice(5, 7), 16) / 255
    ) : colors.mediumGray;

    // Issue card
    page.drawRectangle({ x: 40, y: y - issueHeight, width: width - 80, height: issueHeight, color: cardColor, opacity: 0.08 });
    page.drawRectangle({ x: 40, y: y - issueHeight, width: width - 80, height: issueHeight, borderColor: cardColor, borderWidth: 2 });

    // Header
    page.drawText(`${severityInfo?.label || issue.severity.toUpperCase()} - ${categoryInfo.icon} ${categoryInfo.title}`, {
        x: 55, y: y - 20, size: 12, font: boldFont, color: cardColor
    });

    // Status badge with box
    page.drawRectangle({ x: width - 130, y: y - 25, width: 70, height: 15, color: cardColor, opacity: 0.2 });
    const status = issue.status.toUpperCase().replace(/[^\x20-\x7E]/g, '');
    page.drawText(status, { x: width - 125, y: y - 22, size: 8, font: boldFont, color: cardColor });    // Content
    page.drawText(`Section: ${issue.section}`, { x: 55, y: y - 35, size: 9, font, color: colors.text });
    page.drawText(`Issue: ${truncateText(issue.issueExplanation, 80)}`, { x: 55, y: y - 50, size: 9, font, color: colors.text });
    page.drawText(`Original: "${truncateText(issue.originalText, 60)}"`, { x: 55, y: y - 65, size: 8, font, color: colors.textLight });
    page.drawText(`Suggested: "${truncateText(issue.suggestedRewrite, 60)}"`, { x: 55, y: y - 80, size: 8, font, color: colors.textLight });

    return y - issueHeight - 15;
}

function drawRecommendations(page: any, recommendations: any[], y: number, colors: any, font: any, boldFont: any, width: number): number {
    const recHeight = 60;
    const limitedRecs = recommendations.slice(0, 8);

    for (let i = 0; i < limitedRecs.length; i++) {
        const rec = limitedRecs[i];
        const cardY = y - (i * (recHeight + 10));

        page.drawRectangle({ x: 40, y: cardY - recHeight, width: width - 80, height: recHeight, color: colors.background });
        page.drawRectangle({ x: 40, y: cardY - recHeight, width: width - 80, height: recHeight, borderColor: colors.primary, borderWidth: 1 });

        if (typeof rec === "string") {
            page.drawText(`${i + 1}. ${truncateText(rec, 100)}`, { x: 55, y: cardY - 20, size: 11, font: boldFont, color: colors.primary });
            page.drawText(truncateText(rec, 150), { x: 65, y: cardY - 40, size: 9, font, color: colors.text, maxWidth: width - 120 });
        } else {
            page.drawText(`${i + 1}. ${rec.heading}`, { x: 55, y: cardY - 15, size: 11, font: boldFont, color: colors.primary });
            page.drawText(`Priority: ${rec.priority || 'Medium'} - Impact: ${rec.impact_score || 'N/A'}`, { x: 55, y: cardY - 30, size: 8, font, color: colors.textLight });
            // Sanitize points to only use ASCII characters
            const sanitizedPoints = rec.points.map((point: string) =>
                point.replace(/[^\x20-\x7E]/g, '').trim()
            ).join("; ");
            page.drawText(truncateText(sanitizedPoints, 120), { x: 65, y: cardY - 45, size: 9, font, color: colors.text, maxWidth: width - 120 });
        }

        y = cardY - recHeight - 15;
        if (y < 100) break;
    }

    return y;
}

function drawRoadmap(page: any, roadmap: any[], y: number, colors: any, font: any, boldFont: any, width: number): number {
    const phaseHeight = 80;
    const limitedRoadmap = roadmap.slice(0, 4);

    for (let i = 0; i < limitedRoadmap.length; i++) {
        const phase = limitedRoadmap[i];
        const cardY = y - (i * (phaseHeight + 15));

        page.drawRectangle({ x: 40, y: cardY - phaseHeight, width: width - 80, height: phaseHeight, color: colors.background });
        page.drawRectangle({ x: 40, y: cardY - phaseHeight, width: width - 80, height: phaseHeight, borderColor: colors.primary, borderWidth: 1 });

        // Phase header
        page.drawText(`Phase ${i + 1}: ${phase.name}`, { x: 55, y: cardY - 20, size: 12, font: boldFont, color: colors.primary });
        page.drawText(`Timeline: ${phase.timeline}`, { x: width - 150, y: cardY - 20, size: 10, font, color: colors.textLight });

        // Details
        page.drawText(`Focus: ${phase.focusAreas.join(", ")}`, { x: 65, y: cardY - 40, size: 9, font, color: colors.text });
        page.drawText(`Deliverables: ${truncateText(phase.deliverables.join("; "), 80)}`, { x: 65, y: cardY - 55, size: 9, font, color: colors.text });
        page.drawText(`Success: ${phase.successCriteria}`, { x: 65, y: cardY - 70, size: 9, font, color: colors.text });

        y = cardY - phaseHeight - 20;
        if (y < 100) break;
    }

    return y;
}

function drawFooter(page: any, pageNum: number, totalPages: number, colors: any, font: any) {
    const { width } = page.getSize();

    // Footer background with subtle gradient
    page.drawRectangle({
        x: 0, y: 0, width, height: 70,
        color: colors.background
    });

    // Decorative lines
    page.drawLine({
        start: { x: 40, y: 55 },
        end: { x: width - 40, y: 55 },
        color: colors.primary,
        thickness: 0.5
    });
    page.drawLine({
        start: { x: 40, y: 53 },
        end: { x: width - 40, y: 53 },
        color: colors.primary,
        opacity: 0.5,
        thickness: 0.5
    });

    // Footer text with improved layout
    page.drawText("Cleardoc Platform", {
        x: 40, y: 35, size: 10, font, color: colors.primary
    });
    page.drawText("Document Intelligence & Compliance Analysis", {
        x: 150, y: 35, size: 9, font, color: colors.mediumGray
    });

    // Page numbers with decorative elements
    page.drawText(`Page ${pageNum} of ${totalPages}`, {
        x: width - 100, y: 35, size: 9, font, color: colors.primary
    });

    // Generated timestamp
    page.drawText("Generated on:", {
        x: 40, y: 20, size: 8, font, color: colors.mediumGray
    });
    page.drawText(new Date().toLocaleDateString(), {
        x: 110, y: 20, size: 8, font, color: colors.mediumGray
    });

    // Add confidentiality notice
    page.drawText("Confidential & Proprietary", {
        x: width - 150, y: 20, size: 8, font, color: colors.mediumGray,
        opacity: 0.7
    });
}

