"use client"

import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"
import { ConvexLoading } from "@/components/convex-error-boundary"
import { CustomRulesSelector } from "@/components/custom-rules-selector"
import { DashboardHeader } from "@/components/dashboard-header"
import { IssuesList } from "@/components/issues-list"
import { PdfViewerWrapper as PdfViewer } from "@/components/pdf-viewer-wrapper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { LanguageComplexityAnalysis } from "@/lib/language-complexity-analyzer"
import type { ComprehensibilityReportData } from "@/lib/report"
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "@/lib/scoring-service"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  Info,
  RefreshCw,
  Wand2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"

type IssueSeverity = "critical" | "high" | "medium" | "low"
type IssueStatus = "open" | "inprogress" | "verified" | "closed" | "false_positive"

interface AnalyzedIssue {
  _id: string
  severity: IssueSeverity | string
  type: string
  status: IssueStatus | string
  section?: string
  originalText?: string
  issueExplanation?: string
  suggestedRewrite?: string
  offsetStart?: number
  offsetEnd?: number
  createdAt?: number
}

interface StructuredRecommendation {
  heading: string
  points: string[]
  priority: "low" | "medium" | "high"
  category?: string
  impact_score?: number
  implementation_effort?: "low" | "medium" | "high"
}

type Recommendation = string | StructuredRecommendation

interface ComplianceStatus {
  regulatory_alignment?: string
  transparency_score?: number
  improvement_priority?: string
  legal_risk_areas?: string[]
}

interface SectionAggregation {
  issues: AnalyzedIssue[]
  totalIssues: number
  severityWeights: Record<IssueSeverity, number>
  score: number
}

interface DocumentInfo {
  _id: string
  name: string
  url?: string
  fileId?: string
  language?: string
  documentType?: string
  targetAudience?: string
  jurisdiction?: string
  regulations?: string[] | string | null
  createdAt: number | string
}

interface Analysis {
  summary?: string
  recommendations?: Recommendation[]
  score?: number
  status?: string
  readability_metrics?: {
    flesch_kincaid_grade?: number
    coleman_liau_index?: number
    reading_time_minutes?: number
    grade_level?: string
    reading_ease_score?: number
    passive_voice_percentage?: number
    [key: string]: number | string | undefined
  } | null
  accessibility_assessment?: {
    assessment_summary?: string
    readability_score?: number
    clarity_score?: number
    key_findings?: { title: string; detail: string }[]
    quickWins?: string[]
    quick_wins?: string[]
    quick_wins_recommendations?: string[]
    wcag_compliance_level?: "AA" | "A" | "Non-compliant"
    screen_reader_compatibility?: "high" | "medium" | "low"
    cognitive_accessibility?: "high" | "medium" | "low"
    multilingual_considerations?: string
    [key: string]: unknown
  } | null
  compliance_status?: ComplianceStatus
  pdf_structure_compliance?: {
    overall?: string
    issues?: string[]
    compliantElements?: string[]
    nonCompliantElements?: string[]
    summary?: string
    [key: string]: unknown
  } | null
  language_complexity?: LanguageComplexityAnalysis
  createdAt?: number | string
  documentText?: string
  analysisId?: string
  _id?: string
  scoringConfig?: AnalysisScoringConfig
  scoringConfigId?: string
}

type ViewerIssue = {
  _id: string
  originalText: string
  offsetStart?: number
  offsetEnd?: number
  severity: string
  type: string
}

type ReportAnalysis = NonNullable<ComprehensibilityReportData["analysis"]>
type ReportIssue = ComprehensibilityReportData["issues"][number]
type ReportAccessibilityAssessment = NonNullable<ReportAnalysis["accessibility_assessment"]>
type ReportComplianceStatus = NonNullable<ReportAnalysis["compliance_status"]>

interface AnalysisScoringConfig extends ScoringConfig {
  createdAt?: number
  updatedAt?: number
  _id?: string
}

const SCORING_SEVERITY_ORDER: Array<keyof AnalysisScoringConfig["severityWeights"]> = [
  "critical",
  "high",
  "medium",
  "low",
]

const SCORING_CATEGORY_ORDER: Array<keyof AnalysisScoringConfig["categoryWeights"]> = [
  "clarity",
  "grammar",
  "style",
  "legal",
  "compliance",
  "structure",
  "accessibility",
  "security",
  "transparency",
  "other",
]

export default function DocumentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string>("All")
  const router = useRouter()
  const { toast } = useToast()

  // Convex hooks for data fetching
  const scanData = useQuery(api.scans.getScanWithAnalysisAndIssues, { id: id })
  const performAnalysis = useAction(api.analysis_action.performDocumentAnalysis)
  const updateIssue = useMutation(api.issues.updateIssue)
  const generateReport = useAction(api.report_action.generateReport)
  const scoringConfigs = useQuery(api.scoringConfigs.getScoringConfigs, {}) ?? []

  // Extract data from Convex response
  const document = scanData?.document as DocumentInfo | undefined
  const analysis = scanData?.analysis as Analysis | undefined
  const issues: AnalyzedIssue[] = (scanData?.issues as AnalyzedIssue[] | undefined) ?? []
  const readabilityMetrics = analysis?.readability_metrics ?? undefined
  const languageComplexity = analysis?.language_complexity ?? undefined
  const analysisScoringConfig: AnalysisScoringConfig | null =
    analysis?.scoringConfig ??
    (analysis && !analysis.scoringConfigId
      ? {
        ...DEFAULT_SCORING_CONFIG,
        _id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      }
      : null)
  const [selectedScoringConfigId, setSelectedScoringConfigId] = useState<string | null>(null)

  useEffect(() => {
    if (analysis?.scoringConfigId) {
      setSelectedScoringConfigId(analysis.scoringConfigId)
    }
  }, [analysis?.scoringConfigId])

  const defaultScoringConfig = scoringConfigs.find((config: ScoringConfig) => config.isDefault)
  const nextScoringConfig =
    selectedScoringConfigId
      ? scoringConfigs.find((config: ScoringConfig) => String(config._id) === selectedScoringConfigId) ?? null
      : defaultScoringConfig ?? null

  // --- Move fileSize state and effect here, before any return ---
  const [fileSize, setFileSize] = useState<string | null>(null);
  useEffect(() => {
    async function fetchFileSize() {
      if (!document?.url) return;
      try {
        const response = await fetch(document.url, { method: "HEAD" });
        const size = response.headers.get("Content-Length");
        if (size) {
          const num = Number(size);
          setFileSize(
            num > 1024 * 1024
              ? `${(num / (1024 * 1024)).toFixed(2)} MB`
              : `${(num / 1024).toFixed(2)} KB`
          );
        } else {
          setFileSize("N/A");
        }
      } catch {
        setFileSize("N/A");
      }
    }
    fetchFileSize();
  }, [document?.url]);
  // --- End move ---

  // Calculate counts per severity and filtered issues list
  const severityCounts: Record<string, number> = issues.reduce<Record<string, number>>((acc, issue) => {
    const sev = issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1).toLowerCase()
    acc[sev] = (acc[sev] || 0) + 1
    return acc
  }, {})
  const filteredIssues = issues.filter((issue) =>
    severityFilter === "All" ||
    issue.severity.toLowerCase() === severityFilter.toLowerCase()
  )

  // Small helper to capitalise first letter
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  // Map severity levels to color classes (bg + text)
  const severityClass = (severity: string) => {
    const sev = cap(severity)
    switch (sev) {
      case "Critical":
        return "bg-[#FF0000] text-white" // Red
      case "High":
        return "bg-[#FFA500] text-white" // Orange
      case "Medium":
        return "bg-[#FFFF00] text-black" // Yellow
      case "Low":
      default:
        return "bg-[#008000] text-white" // Green
    }
  }

  const [selectedRules, setSelectedRules] = useState<Id<"customRules">[]>([])
  const [showRulesSelector, setShowRulesSelector] = useState(false)

  // PDF Viewer state
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const selectedAnalyzedIssue = selectedIssueId
    ? issues.find((issue) => issue._id === selectedIssueId) ?? null
    : null

  const viewerSelectedIssue: ViewerIssue | null = selectedAnalyzedIssue
    ? {
      _id: selectedAnalyzedIssue._id,
      originalText: selectedAnalyzedIssue.originalText ?? "",
      offsetStart: selectedAnalyzedIssue.offsetStart,
      offsetEnd: selectedAnalyzedIssue.offsetEnd,
      severity: String(selectedAnalyzedIssue.severity),
      type: selectedAnalyzedIssue.type,
    }
    : null

  // Handle issue selection for PDF viewer
  const handleIssueClick = (issue: AnalyzedIssue) => {
    setSelectedIssueId(issue._id)
  }

  // Handle PDF highlighting feedback
  const handleIssueHighlight = (issue: ViewerIssue, success: boolean) => {
    if (success) {
      toast({
        title: "Issue Located",
        description: `Successfully highlighted "${issue.type}" issue in PDF.`,
      })
    } else {
      // Provide more detailed error information and fallback options
      const hasOffset = issue.offsetStart !== undefined && issue.offsetEnd !== undefined
      const hasOriginalText = issue.originalText && issue.originalText.trim().length > 0

      let description = "Could not locate the selected issue text in the PDF document."

      if (!hasOffset && !hasOriginalText) {
        description = "Issue lacks both position data and text content for location."
      } else if (!hasOffset) {
        description = "Issue position data unavailable. Text search also failed."
      } else if (!hasOriginalText) {
        description = "Issue text content unavailable for fallback search."
      }

      toast({
        title: "Issue Not Found",
        description,
        variant: "destructive",
        action: document?.url ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(document.url, '_blank')}
          >
            Open PDF
          </Button>
        ) : undefined,
      })
    }
  }

  // Rewrite section state
  const [originalText, setOriginalText] = useState("")
  const [rewrittenText, setRewrittenText] = useState("")
  const [isRewriting, setIsRewriting] = useState(false)
  const [originalScore, setOriginalScore] = useState<number | null>(null)
  const [rewrittenScore, setRewrittenScore] = useState<number | null>(null)

  const handleReanalysis = async () => {
    setIsAnalyzing(true)
    toast({
      title: "Analysis Started",
      description: `The document is being re-analyzed${nextScoringConfig ? ` using "${nextScoringConfig.name}" scoring weights` : ""}. This may take a moment.`,
    })
    try {
      await performAnalysis({
        scanId: id as Id<"scans">,
        customRuleIds: selectedRules.length > 0 ? selectedRules : undefined,
        scoringConfigId: selectedScoringConfigId
          ? (selectedScoringConfigId as Id<"scoringConfigs">)
          : undefined,
      })

      toast({
        title: "Analysis Complete",
        description: "The document has been successfully re-analyzed.",
      })
      // No need to call router.refresh() - Convex will update automatically
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const connectionLost = errorMessage.includes("Connection lost while action was in flight")

      if (connectionLost) {
        toast({
          title: "Analysis Continuing",
          description:
            "The connection to the analysis worker dropped, but the job is still running. Results will refresh automatically once it finishes.",
        })
      } else {
        toast({
          title: "Analysis Failed",
          description: `Could not start the re-analysis process: ${errorMessage}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Define handler for issue status change
  const handleStatusChange = async (issueId: string, newStatus: IssueStatus) => {
    try {
      await updateIssue({
        id: issueId as Id<"issues">,
        status: newStatus
      });

      toast({
        title: "Status Updated",
        description: `Issue status changed to ${newStatus}.`
      });
    } catch (error) {
      console.error("Failed to update issue status:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Error",
        description: `Could not update issue status: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  // Handler for text rewriting
  const handleRewrite = async () => {
    if (!originalText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to rewrite.",
        variant: "destructive"
      });
      return;
    }

    setIsRewriting(true);
    setRewrittenText("");
    setOriginalScore(null);
    setRewrittenScore(null);

    try {
      // Use AI-powered rewrite with the same models as document analysis
      const rewriteResult = await performTextRewrite({
        text: originalText,
        documentText: analysis?.documentText,
        documentType: document?.documentType,
        targetAudience: document?.targetAudience,
        jurisdiction: document?.jurisdiction,
        customRuleIds: selectedRules.length > 0 ? selectedRules : undefined
      });

      setRewrittenText(rewriteResult.rewritten);
      setOriginalScore(rewriteResult.originalScore);
      setRewrittenScore(rewriteResult.rewrittenScore);

      toast({
        title: "Rewrite Complete",
        description: "Text has been successfully rewritten for better comprehensibility."
      });
    } catch (error) {
      console.error("Failed to rewrite text:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Rewrite Failed",
        description: `Could not rewrite the text: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };

  // AI-powered rewrite using Convex action
  const performTextRewrite = useAction(api.rewrite_action.performTextRewrite);

  const [copiedIssueId, setCopiedIssueId] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Handler for report download
  const handleDownloadReport = async (format: "csv" | "pdf") => {
    if (!document) return;

    setIsGeneratingReport(true);
    try {
      if (format === "pdf") {
        // For PDF, we'll generate it client-side using lib/report.ts
        const { generatePDFReport } = await import("@/lib/report");

        // Transform the existing scanData to the expected format
        if (!scanData || !analysis) {
          throw new Error("Analysis data not available for PDF generation");
        }

        const analysisCreatedAtValue = analysis.createdAt ?? Date.now()
        const analysisCreatedAtDate = new Date(analysisCreatedAtValue)
        const documentCreatedAtDate = new Date(document.createdAt)
        const documentUpdatedAtDate = new Date(document.createdAt)
        const regulationsString =
          Array.isArray(document.regulations)
            ? document.regulations.join(", ")
            : document.regulations ?? "N/A"
        const recommendationsForReport = (analysis.recommendations ?? []) as Recommendation[]

        let analysisSection: ReportAnalysis | undefined

        if (
          (analysis.summary && analysis.summary.trim().length > 0) ||
          recommendationsForReport.length > 0 ||
          analysis.readability_metrics ||
          analysis.language_complexity ||
          analysis.accessibility_assessment ||
          analysis.compliance_status ||
          analysis.pdf_structure_compliance ||
          analysis.scoringConfig
        ) {
          analysisSection = {
            summary: analysis.summary ?? "",
            recommendations: recommendationsForReport,
          }

          if (analysis.readability_metrics) {
            const rm = analysis.readability_metrics
            const readabilityForReport: NonNullable<ReportAnalysis["readability_metrics"]> = {}

            if (typeof rm.flesch_kincaid_grade === "number") {
              readabilityForReport.flesch_kincaid_grade = rm.flesch_kincaid_grade
            }
            if (typeof rm.avg_sentence_length === "number") {
              readabilityForReport.avg_sentence_length = rm.avg_sentence_length
            }
            if (typeof rm.complex_words_percentage === "number") {
              readabilityForReport.complex_words_percentage = rm.complex_words_percentage
            }
            if (typeof rm.passive_voice_percentage === "number") {
              readabilityForReport.passive_voice_percentage = rm.passive_voice_percentage
            }

            if (Object.keys(readabilityForReport).length > 0) {
              analysisSection.readability_metrics = readabilityForReport
            }
          }

          if (analysis.language_complexity) {
            analysisSection.language_complexity = analysis.language_complexity
          }

          if (analysis.accessibility_assessment) {
            const aa = analysis.accessibility_assessment
            const mapped: ReportAccessibilityAssessment = {
              wcag_compliance_level: aa.wcag_compliance_level as ReportAccessibilityAssessment["wcag_compliance_level"],
              screen_reader_compatibility: aa.screen_reader_compatibility as ReportAccessibilityAssessment["screen_reader_compatibility"],
              cognitive_accessibility: aa.cognitive_accessibility as ReportAccessibilityAssessment["cognitive_accessibility"],
              multilingual_considerations: aa.multilingual_considerations as ReportAccessibilityAssessment["multilingual_considerations"],
            }
            analysisSection.accessibility_assessment = mapped
          }

          if (analysis.compliance_status) {
            const cs = analysis.compliance_status
            const mapped: ReportComplianceStatus = {
              regulatory_alignment: cs.regulatory_alignment as ReportComplianceStatus["regulatory_alignment"],
              transparency_score: cs.transparency_score,
              legal_risk_areas: cs.legal_risk_areas,
              improvement_priority: cs.improvement_priority as ReportComplianceStatus["improvement_priority"],
            }
            analysisSection.compliance_status = mapped
          }

          if (analysisScoringConfig) {
            analysisSection.scoringConfig = analysisScoringConfig
          }

          // Skip pdf_structure_compliance for now unless it matches expected schema
        }

        const reportIssues: ReportIssue[] = issues.map((issue) => ({
          id: issue._id,
          severity: String(issue.severity),
          type: issue.type,
          status: String(issue.status),
          section: issue.section ?? "N/A",
          originalText: issue.originalText ?? "",
          issueExplanation: issue.issueExplanation ?? "",
          suggestedRewrite: issue.suggestedRewrite ?? "",
          offsetStart: issue.offsetStart,
          offsetEnd: issue.offsetEnd,
        }))

        const reportData: ComprehensibilityReportData = {
          id: document._id,
          name: document.name,
          documentType: document.documentType ?? "Unknown",
          language: document.language ?? "Unknown",
          targetAudience: document.targetAudience ?? "General",
          jurisdiction: document.jurisdiction ?? "N/A",
          regulations: regulationsString,
          status: analysis.status ?? "unknown",
          url: document.url ?? "",
          startedAt: analysisCreatedAtDate.toISOString(),
          completedAt: analysis.status === "completed" ? analysisCreatedAtDate.toISOString() : undefined,
          createdAt: documentCreatedAtDate.toISOString(),
          updatedAt: documentUpdatedAtDate.toISOString(),
          analysisId: analysis.analysisId ?? analysis._id,
          scoringConfigId: analysis.scoringConfigId,
          comprehensibilityScore: analysis.score,
          analysis: analysisSection,
          issues: reportIssues,
          stats: {
            total: issues.length,
            critical: issues.filter((i) => i.severity === "critical").length,
            high: issues.filter((i) => i.severity === "high").length,
            medium: issues.filter((i) => i.severity === "medium").length,
            low: issues.filter((i) => i.severity === "low").length,
            openCount: issues.filter((i) => i.status === "open" || i.status === "inprogress").length,
            closedCount: issues.filter((i) => i.status === "closed" || i.status === "verified").length,
          },
        }

        // Generate PDF
        const pdfBuffer = await generatePDFReport(reportData);
        const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // For CSV, use the server-side generation
        const reportResult = await generateReport({
          scanId: id as Id<"scans">,
          format
        });

        // For text files (CSV), use content directly
        const blob = new Blob([reportResult.content], { type: reportResult.contentType });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = reportResult.filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Report Downloaded",
        description: `${format.toUpperCase()} report has been downloaded successfully.`,
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Download Failed",
        description: `Could not generate the report: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Show loading state while data is being fetched
  if (scanData === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="p-6">
          <ConvexLoading message="Loading document..." />
        </div>
      </div>
    )
  }

  if (!scanData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h2>
          <p className="text-gray-600 mb-6">
            The document you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </p>
          <Link href="/dashboard/documents" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Link>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h2>
          <p className="text-gray-600 mb-6">
            The document you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </p>
          <Link href="/dashboard/documents" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader

      />

      <div className="p-6">
        <div className="mb-6">
          <Link href="/dashboard/documents" className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{document.documentType || "N/A"}</span>
                <span>•</span>
                <span>{new Date(document.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReport("csv")}
                  disabled={isGeneratingReport || !analysis}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingReport ? "Generating..." : "CSV Report"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReport("pdf")}
                  disabled={isGeneratingReport || !analysis}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isGeneratingReport ? "Generating..." : "PDF Report"}
                </Button>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Scoring Config</span>
                <Select
                  value={selectedScoringConfigId ?? "default"}
                  onValueChange={(value) => {
                    if (value === "default") {
                      setSelectedScoringConfigId(null)
                    } else {
                      setSelectedScoringConfigId(value)
                    }
                  }}
                  disabled={isAnalyzing || scoringConfigs.length === 0}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Choose configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      Use Default ({defaultScoringConfig?.name ?? "Platform Default"})
                    </SelectItem>
                    {scoringConfigs
                      .filter((config: ScoringConfig) => !config.isDefault)
                      .map((config: ScoringConfig) => (
                        <SelectItem key={String(config._id)} value={String(config._id)}>
                          {config.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">
                  Next run: {nextScoringConfig?.name ?? defaultScoringConfig?.name ?? "Platform Default"}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowRulesSelector(!showRulesSelector)}
              >
                {showRulesSelector ? "Hide Custom Rules" : "Select Custom Rules"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowPdfViewer(!showPdfViewer)}
                className={`transition-all duration-300 ${showPdfViewer
                  ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 shadow-md'
                  : 'hover:bg-gray-50 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center space-x-2">
                  <span className={`transition-transform duration-300 ${showPdfViewer ? 'rotate-180' : ''}`}>
                    📄
                  </span>
                  <span>{showPdfViewer ? "Hide PDF" : "Show PDF"}</span>
                </span>
              </Button>

              {/* <Button variant="outline">
                <Share className="w-4 h-4 mr-2" />
              </Button> */}
              {/* <Button variant="outline" asChild>
                <a href={document.url} download>
                  <Download className="w-4 h-4 mr-2" />
                </a>
              </Button> */}
              <Button onClick={handleReanalysis} disabled={isAnalyzing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
                {isAnalyzing ? "Analyzing..." : "Re-analyze"}
              </Button>
              {/* {analysis && <Badge className="text-sm px-3 py-1">{analysis.status || "Analyzed"}</Badge>} */}
            </div>
          </div>
        </div>

        {showRulesSelector && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Custom Rules for Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Select the custom rules you want to apply during document analysis:</p>
              <CustomRulesSelector
                selectedRules={selectedRules}
                onSelectionChange={setSelectedRules}
              />
            </CardContent>
          </Card>
        )}

        {!analysis && !isAnalyzing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Analysis Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The document is currently being analyzed. This page will update automatically when it&apos;s complete.</p>
              <Button onClick={handleReanalysis} disabled={isAnalyzing} className="mt-4">
                <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
                {isAnalyzing ? "Analyzing..." : "Analyze Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isAnalyzing && !analysis && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Analysis in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p>The document is currently being analyzed. This page will update automatically when it&apos;s complete.</p>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className={showPdfViewer ? "lg:col-span-4" : "lg:col-span-3"}>
              <Tabs defaultValue="overview" className="space-y-4 lg:space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-whiteleading-relaxed">{analysis?.summary ?? ''}</p>
                    </CardContent>
                  </Card>

                  {analysisScoringConfig && (
                    <Card>
                      <CardHeader className="space-y-2 sm:space-y-1 sm:flex sm:items-start sm:justify-between">
                        <div>
                          <CardTitle>Scoring Configuration</CardTitle>
                          <p className="text-sm text-gray-500">
                            Used for this analysis to compute the final score.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{analysisScoringConfig.name}</Badge>
                          {analysisScoringConfig.isDefault && <Badge variant="secondary">Default</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Severity Weights</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {SCORING_SEVERITY_ORDER.map((severity) => (
                              <div key={severity} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="text-xs uppercase text-gray-500">{cap(severity)}</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {analysisScoringConfig.severityWeights[severity]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Category Multipliers</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {SCORING_CATEGORY_ORDER.map((category) => (
                              <div key={category} className="p-3 bg-white rounded-lg border border-gray-200">
                                <div className="text-xs font-medium text-gray-500">{cap(category)}</div>
                                <div className="text-base font-semibold text-gray-900">
                                  {analysisScoringConfig.categoryWeights[category].toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Score Thresholds</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                              <div className="text-xs font-medium text-green-700">Pass</div>
                              <div className="text-lg font-semibold text-green-900">
                                score &gt;= {analysisScoringConfig.thresholds.pass}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                              <div className="text-xs font-medium text-yellow-700">Warning</div>
                              <div className="text-lg font-semibold text-yellow-900">
                                score &gt;= {analysisScoringConfig.thresholds.warning}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                              <div className="text-xs font-medium text-red-700">Fail</div>
                              <div className="text-lg font-semibold text-red-900">
                                score &lt;= {analysisScoringConfig.thresholds.fail}
                              </div>
                              <p className="text-xs text-red-600 mt-1">
                                Warning range covers scores between fail and pass thresholds.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Readability Metrics */}
                  {readabilityMetrics && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Readability Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {typeof readabilityMetrics.flesch_kincaid_grade === "number" && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {readabilityMetrics.flesch_kincaid_grade.toFixed(1)}
                              </div>
                              <div className="text-sm text-gray-500">Reading Level</div>
                            </div>
                          )}
                          {typeof readabilityMetrics.avg_sentence_length === "number" && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {readabilityMetrics.avg_sentence_length.toFixed(1)}
                              </div>
                              <div className="text-sm text-gray-500">Avg Sentence Length</div>
                            </div>
                          )}
                          {typeof readabilityMetrics.complex_words_percentage === "number" && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {readabilityMetrics.complex_words_percentage.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">Complex Words</div>
                            </div>
                          )}
                          {typeof readabilityMetrics.passive_voice_percentage === "number" && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {readabilityMetrics.passive_voice_percentage.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">Passive Voice</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Accessibility Assessment */}
                  {analysis?.accessibility_assessment && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Accessibility Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {analysis.accessibility_assessment.wcag_compliance_level && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium">WCAG Compliance</span>
                              <Badge
                                className={`${analysis.accessibility_assessment.wcag_compliance_level === 'AA' ? 'bg-green-100 text-green-800' :
                                  analysis.accessibility_assessment.wcag_compliance_level === 'A' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                              >
                                {analysis.accessibility_assessment.wcag_compliance_level}
                              </Badge>
                            </div>
                          )}
                          {analysis.accessibility_assessment.screen_reader_compatibility && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium">Screen Reader</span>
                              <Badge
                                className={`${analysis.accessibility_assessment.screen_reader_compatibility === 'high' ? 'bg-green-100 text-green-800' :
                                  analysis.accessibility_assessment.screen_reader_compatibility === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                              >
                                {analysis.accessibility_assessment.screen_reader_compatibility}
                              </Badge>
                            </div>
                          )}
                          {analysis.accessibility_assessment.cognitive_accessibility && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium">Cognitive Access</span>
                              <Badge
                                className={`${analysis.accessibility_assessment.cognitive_accessibility === 'high' ? 'bg-green-100 text-green-800' :
                                  analysis.accessibility_assessment.cognitive_accessibility === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                              >
                                {analysis.accessibility_assessment.cognitive_accessibility}
                              </Badge>
                            </div>
                          )}
                        </div>
                        {analysis.accessibility_assessment.multilingual_considerations && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">Multilingual Considerations</h4>
                            <p className="text-sm text-blue-700">{analysis.accessibility_assessment.multilingual_considerations}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Compliance Status */}
                  {analysis?.compliance_status && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Compliance Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {analysis.compliance_status.regulatory_alignment && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Regulatory Alignment</span>
                                <Badge
                                  className={`${analysis.compliance_status.regulatory_alignment === 'full' ? 'bg-green-100 text-green-800' :
                                    analysis.compliance_status.regulatory_alignment === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}
                                >
                                  {analysis.compliance_status.regulatory_alignment}
                                </Badge>
                              </div>
                            )}
                            {analysis.compliance_status.transparency_score && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Transparency Score</span>
                                <Badge variant="outline">
                                  {analysis.compliance_status.transparency_score}/100
                                </Badge>
                              </div>
                            )}
                            {analysis.compliance_status.improvement_priority && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Priority</span>
                                <Badge
                                  className={`${analysis.compliance_status.improvement_priority === 'high' ? 'bg-red-100 text-red-800' :
                                    analysis.compliance_status.improvement_priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}
                                >
                                  {analysis.compliance_status.improvement_priority}
                                </Badge>
                              </div>
                            )}
                          </div>
                          {analysis.compliance_status.legal_risk_areas && analysis.compliance_status.legal_risk_areas.length > 0 && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <h4 className="font-medium text-red-800 mb-2">Legal Risk Areas</h4>
                              <ul className="text-sm text-red-700 space-y-1">
                                {analysis.compliance_status.legal_risk_areas.map((risk, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Language Complexity */}
                  {languageComplexity && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Language Complexity Assessment (CEFR B2)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {languageComplexity.cefrLevel}
                            </div>
                            <div className="text-sm text-gray-500">CEFR Level</div>
                          </div>
                          {languageComplexity.b2ComplianceScore > 0 && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {languageComplexity.b2ComplianceScore.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">B2 Compliance</div>
                            </div>
                          )}
                          {languageComplexity.plainLanguageScore > 0 && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {languageComplexity.plainLanguageScore.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">Plain Language Score</div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {languageComplexity.readabilityAdjusted.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-500">Adjusted FK Grade</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Avg Sentence Length</span>
                            <Badge variant="outline">
                              {languageComplexity.sentenceComplexity.averageSentenceLength.toFixed(1)} words
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Passive Voice</span>
                            <Badge variant="outline">
                              {languageComplexity.sentenceComplexity.passiveVoicePercentage.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Advanced Vocabulary</span>
                            <Badge variant="outline">
                              {languageComplexity.vocabularyComplexity.advancedWordPercentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>

                        {languageComplexity.vocabularyComplexity.jargonCount > 0 && (
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <h4 className="font-medium text-yellow-800 mb-2">
                              Jargon Detected ({languageComplexity.vocabularyComplexity.jargonCount})
                            </h4>
                            <p className="text-sm text-yellow-700">
                              {languageComplexity.vocabularyComplexity.jargonTerms.slice(0, 5).join(", ") || "Terms detected"}
                              {languageComplexity.vocabularyComplexity.jargonTerms.length > 5 && (
                                <span>
                                  {" "}
                                  (+{languageComplexity.vocabularyComplexity.jargonTerms.length - 5} more)
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        {languageComplexity.plainLanguageRecommendations.length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">Plain Language Recommendations</h4>
                            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                              {languageComplexity.plainLanguageRecommendations.slice(0, 3).map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {/* arrange the recommendations by priority, fallback if array of strings */}
                        {Array.isArray(analysis?.recommendations) && analysis.recommendations.length > 0 ? (
                          analysis.recommendations.every(rec => typeof rec === "string") ? (
                            analysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-black dark:text-white ">{rec as string}</span>
                              </li>
                            ))
                          ) : (
                            (analysis.recommendations as { heading: string, points: string[], priority: "low" | "medium" | "high", category?: string, impact_score?: number, implementation_effort?: "low" | "medium" | "high" }[]).sort((a, b) => {
                              if (a.priority === "high") return -1;
                              if (a.priority === "medium") return 0;
                              return 1;
                            }).map((rec, index) => (
                              <li key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3">
                                    <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${rec.priority === "high" ? "text-red-500" : rec.priority === "medium" ? "text-yellow-500" : "text-green-500"}`} />
                                    <div>
                                      <h3 className="font-medium text-black dark:text-white">{rec.heading}</h3>
                                      {rec.category && (
                                        <Badge variant="outline" className="mt-1 text-xs">
                                          {rec.category}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge className={`${rec.priority === "high" ? "bg-red-100 text-red-800" : rec.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                                      {rec.priority}
                                    </Badge>
                                    {rec.impact_score && (
                                      <Badge variant="outline" className="text-xs">
                                        Impact: {rec.impact_score}
                                      </Badge>
                                    )}
                                    {rec.implementation_effort && (
                                      <Badge variant="secondary" className="text-xs">
                                        Effort: {rec.implementation_effort}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ul className="list-disc list-inside ml-8 space-y-1">
                                  {rec.points.map((point, pointIndex) => (
                                    <li key={pointIndex} className="text-black dark:text-white text-sm">{point}</li>
                                  ))}
                                </ul>
                              </li>
                            ))
                          )
                        ) : (
                          <li className="text-gray-500">No recommendations available</li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="issues" className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-2">
                        <div className="text-sm text-gray-500"> Total issues: {issues.length} </div>
                        <Badge className={severityClass('Critical')}>Critical </Badge>
                        <Badge className={severityClass('High')}>High</Badge>
                        <Badge className={severityClass('Medium')}>Medium</Badge>
                        <Badge className={severityClass('Low')}>Low</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="pdf-viewer-toggle" checked={showPdfViewer} onCheckedChange={setShowPdfViewer} />
                        <label htmlFor="pdf-viewer-toggle" className="text-sm">PDF Viewer</label>
                        <Button asChild variant="outline" size="sm">
                          <Link href={document?.url ?? '#'} target="_blank" download>
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                  {showPdfViewer ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4 lg:gap-6">
                      <div className="order-2 xl:order-1">
                        <PdfViewer
                          documentUrl={document?.url || ''}
                          selectedIssue={viewerSelectedIssue}
                          onIssueHighlight={handleIssueHighlight}
                          className="h-[400px] sm:h-[500px] lg:h-[600px] xl:h-[700px]"
                        />
                      </div>
                      <div className="order-1 xl:order-2">
                        <IssuesList
                          issues={issues}
                          selectedIssueId={selectedIssueId}
                          onIssueClick={handleIssueClick}
                          severityFilter={severityFilter}
                        />
                      </div>
                    </div>
                  ) : (
                    filteredIssues.length === 0 ? (
                      <p className="text-center text-gray-500">
                        {severityFilter === "All"
                          ? "No issues found."
                          : `No ${severityFilter.toLowerCase()} issues found.`}
                      </p>
                    ) : (
                      <>
                        {filteredIssues.map((issue) => (
                          <Card key={issue._id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  {/* <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${severityClass(issue.severity)}`}
                                  >
                                    {cap(issue.severity) === "Critical" ? (
                                      <AlertTriangle className="w-4 h-4 text-white" />
                                    ) : cap(issue.severity) === "High" ? (
                                      <AlertCircle className="w-4 h-4 text-white" />
                                    ) : cap(issue.severity) === "Medium" ? (
                                      <Info className="w-4 h-4 text-black" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 text-white" />
                                    )}
                                  </div> */}
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <Badge className={severityClass(issue.severity)}>
                                        {cap(issue.severity)}
                                      </Badge>
                                      <Badge variant="outline">{issue.type}</Badge>
                                      <span className="text-sm text-gray-500">{issue.section}</span>
                                    </div>
                                  </div>
                                </div>
                                <Select value={issue.status} onValueChange={(val) => handleStatusChange(issue._id, val as "open" | "inprogress" | "verified" | "closed" | "false_positive")}>
                                  <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="inprogress">In Progress</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                    <SelectItem value="false_positive">False Positive</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Original Text:</h4>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <p className="text-black">{issue.originalText}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Issue Explanation:</h4>
                                <p className=" dark:text-white">{issue.issueExplanation}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Suggested Rewrite:</h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between">
                                  <p className="text-black break-words mr-2">{issue.suggestedRewrite}</p>
                                  <button
                                    type="button"
                                    className="ml-2 p-1 rounded hover:bg-green-100 transition-colors"
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(issue.suggestedRewrite || "")
                                      setCopiedIssueId(issue._id)
                                      setTimeout(() => setCopiedIssueId(null), 1500)
                                    }}
                                    aria-label="Copy suggested rewrite"
                                  >
                                    {copiedIssueId === issue._id ? (
                                      <span className="text-green-600 text-xs font-medium">Copied!</span>
                                    ) : (
                                      <Copy className="w-4 h-4 text-green-700" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )
                  )}
                </TabsContent>

                <TabsContent value="heatmap" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Section Heatmap</CardTitle>
                      <p className="text-sm text-gray-600">Comprehensibility scores by document section</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(() => {
                          // Group issues by section and calculate scores
                          const sectionData = issues.reduce<Record<string, SectionAggregation>>((acc, issue) => {
                            const section = issue.section || "Unknown Section";
                            if (!acc[section]) {
                              acc[section] = {
                                issues: [],
                                totalIssues: 0,
                                severityWeights: { critical: 0, high: 0, medium: 0, low: 0 },
                                score: 100
                              };
                            }
                            acc[section].issues.push(issue);
                            acc[section].totalIssues++;

                            // Count severity weights for score calculation
                            const severity = issue.severity.toLowerCase();
                            if (severity === "critical") acc[section].severityWeights.critical++;
                            else if (severity === "high") acc[section].severityWeights.high++;
                            else if (severity === "medium") acc[section].severityWeights.medium++;
                            else if (severity === "low") acc[section].severityWeights.low++;

                            return acc;
                          }, {});

                          // Calculate comprehensibility score for each section
                          Object.keys(sectionData).forEach(section => {
                            const data = sectionData[section];
                            const weights = data.severityWeights;

                            // Calculate weighted score (lower is worse)
                            const totalWeight = (weights.critical * 4) + (weights.high * 3) + (weights.medium * 2) + (weights.low * 1);
                            const maxPossibleWeight = data.totalIssues * 4; // If all were critical

                            // Convert to comprehensibility score (higher is better, 0-100 scale)
                            let score = 100;
                            if (data.totalIssues > 0) {
                              score = Math.max(0, 100 - (totalWeight / data.totalIssues * 25));
                            }

                            data.score = Math.round(score);
                          });

                          // Sort sections by score (worst first)
                          const sortedSections = Object.entries(sectionData).sort(([, a], [, b]) => a.score - b.score);

                          return sortedSections.map(([sectionName, data]) => (
                            <div key={sectionName} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-lg">{sectionName}</h3>
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm text-gray-500">{data.totalIssues > 0 ? data.totalIssues : 0} issue{data.totalIssues > 1 ? 's' : ''}</span>
                                  {/* <Badge
                                    className={`text-sm px-3 py-1 ${data.score >= 85 ? 'bg-green-100 text-green-800' :
                                      data.score >= 72 ? 'bg-yellow-100 text-yellow-800' :
                                        data.score >= 58 ? 'bg-orange-100 text-orange-800' :
                                          'bg-red-100 text-red-800'
                                      }`}
                                  >
                                    {data.score}
                                  </Badge> */}
                                </div>
                              </div>

                              {/* Progress bar showing comprehensibility */}
                              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                                <div
                                  className={`h-3 rounded-full transition-all duration-300 ${data.score >= 85 ? 'bg-green-500' :
                                    data.score >= 72 ? 'bg-yellow-500' :
                                      data.score >= 58 ? 'bg-orange-500' :
                                        'bg-red-500'
                                    }`}
                                  style={{ width: `${data.score}%` }}
                                />
                              </div>

                              {/* Issue breakdown */}
                              <div className="flex items-center space-x-4 text-sm">
                                {data.severityWeights.critical > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span>{data.severityWeights.critical} Critical</span>
                                  </div>
                                )}
                                {data.severityWeights.high > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    <span>{data.severityWeights.high} High</span>
                                  </div>
                                )}
                                {data.severityWeights.medium > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <span>{data.severityWeights.medium} Medium</span>
                                  </div>
                                )}
                                {data.severityWeights.low > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>{data.severityWeights.low} Low</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="rewrite" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Document Rewrite</CardTitle>
                      <p className="text-sm text-gray-600">AI-generated improved version with better comprehensibility</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original Text Input */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-lg">Original</h3>
                            {originalScore !== null && (
                              <Badge variant="outline" className="text-sm">
                                Score: {originalScore}
                              </Badge>
                            )}
                          </div>
                          <Textarea
                            placeholder="Paste the text you want to improve here..."
                            value={originalText}
                            onChange={(e) => setOriginalText(e.target.value)}
                            className="min-h-[300px] bg-red-50 border-red-200 focus:border-red-300 text-gray-700 placeholder:text-gray-500"
                            disabled={isRewriting}
                          />
                        </div>

                        {/* Improved Version Output */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-lg">Improved Version</h3>
                            {rewrittenScore !== null && (
                              <Badge variant="outline" className="text-sm">
                                Score: {rewrittenScore}
                              </Badge>
                            )}
                          </div>
                          <Textarea
                            placeholder="Improved version will appear here..."
                            value={rewrittenText}
                            readOnly
                            className="min-h-[300px] bg-green-50 border-green-200 text-gray-700 placeholder:text-gray-500"
                          />
                        </div>
                      </div>

                      {/* Score Improvement Display */}
                      {originalScore !== null && rewrittenScore !== null && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Comprehensibility improved from {originalScore} to {rewrittenScore}
                              (+{rewrittenScore - originalScore} points)
                            </span>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const blob = new Blob([rewrittenText], { type: 'text/plain' });
                                  const url = window.URL.createObjectURL(blob);
                                  const link = window.document.createElement('a');
                                  link.href = url;
                                  link.download = `${document?.name || 'document'}_rewritten.txt`;
                                  window.document.body.appendChild(link);
                                  link.click();
                                  window.document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                }}
                                disabled={!rewrittenText}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Rewrite
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex justify-center">
                        <Button
                          onClick={handleRewrite}
                          disabled={isRewriting || !originalText.trim()}
                          size="lg"
                          className="px-8"
                        >
                          <Wand2 className={`w-4 h-4 mr-2 ${isRewriting ? "animate-spin" : ""}`} />
                          {isRewriting ? "Rewriting..." : "Rewrite Text"}
                        </Button>
                      </div>

                      {/* Rules Applied Notice */}
                      {selectedRules.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start space-x-2">
                            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-yellow-800">Custom Rules Applied</h4>
                              <p className="text-sm text-yellow-700 mt-1">
                                The rewrite will consider the {selectedRules.length} custom rule{selectedRules.length > 1 ? 's' : ''}
                                you selected for this document analysis.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Usage Instructions */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-2">How to use:</h4>
                        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                          <li>Paste the text you want to improve in the &quot;Original&quot; box</li>
                          <li>Click &quot;Rewrite Text&quot; to generate an improved version</li>
                          <li>Review the improved version and comprehensibility score</li>
                          <li>Download the rewrite if you&apos;re satisfied with the results</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {!showPdfViewer && (
              <div className="lg:col-span-1 space-y-4 lg:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Comprehensibility Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComprehensibilityGauge score={analysis.score ?? 50} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Document Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Type:</span>
                      <span className="text-sm font-medium">{document.documentType || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Language:</span>
                      <span className="text-sm font-medium">{document.language || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Size:</span>
                      <span className="text-sm font-medium">{fileSize || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Created:</span>
                      <span className="text-sm font-medium">
                        {new Date(document.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
