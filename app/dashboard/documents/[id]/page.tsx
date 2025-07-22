"use client"

import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"
import { ConvexLoading } from "@/components/convex-error-boundary"
import { CustomRulesSelector } from "@/components/custom-rules-selector"
import { DashboardHeader } from "@/components/dashboard-header"
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
import { useAction, useMutation, useQuery } from "convex/react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  Info,
  RefreshCw,
  Share,
  Wand2
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useEffect, useRef, useState } from "react"
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Dynamically import PDF components to avoid SSR issues
const PdfDocument = dynamic(() => import("react-pdf").then(mod => ({ default: mod.Document })), { ssr: false })
const Page = dynamic(() => import("react-pdf").then(mod => ({ default: mod.Page })), { ssr: false })

export default function DocumentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string>("All")
  const router = useRouter()
  const { toast } = useToast()

  // Convex hooks for data fetching
  const scanData = useQuery(api.scans.getScanWithAnalysisAndIssues, { id: id as Id<"scans"> })
  const performAnalysis = useAction(api.analysis_action.performDocumentAnalysis)
  const updateIssue = useMutation(api.issues.updateIssue)

  // Extract data from Convex response
  const document = scanData?.document
  const analysis = scanData?.analysis
  const issues = scanData?.issues || []

  // Calculate counts per severity and filtered issues list
  const severityCounts: Record<string, number> = issues.reduce((acc: Record<string, number>, issue: any) => {
    const sev = issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1).toLowerCase()
    acc[sev] = (acc[sev] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const filteredIssues = issues.filter((issue: any) =>
    severityFilter === "All" ||
    issue.severity.toLowerCase() === severityFilter.toLowerCase()
  )

  // Small helper to capitalise first letter
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)



  const [selectedRules, setSelectedRules] = useState<Id<"customRules">[]>([])
  const [showRulesSelector, setShowRulesSelector] = useState(false)

  // PDF Viewer state
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pdfDocProxy, setPdfDocProxy] = useState<any | null>(null)
  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const issuePageMapRef = useRef<Record<string, number>>({})
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [highlightedText, setHighlightedText] = useState<string | null>(null)
  const [highlightedPageNumber, setHighlightedPageNumber] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Initialise pdf.js worker
  useEffect(() => {
    setIsClient(true)
    // Only initialize PDF.js on client side
    const initPdfjs = async () => {
      const pdfjs = await import("react-pdf").then(mod => mod.pdfjs)
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
    }
    initPdfjs()
  }, [])

  // Helper to find the page that contains a snippet of text and get text positions
  const findPageForText = async (text: string): Promise<{ pageNumber: number; textItems: any[] }> => {
    if (!pdfDocProxy) return { pageNumber: 1, textItems: [] }
    const snippet = text.slice(0, 50).toLowerCase()
    for (let i = 1; i <= pdfDocProxy.numPages; i++) {
      try {
        // Attempt to fetch the page. This may throw if the underlying
        // PDF worker has already been destroyed (e.g. after unmount).
        const page = await pdfDocProxy.getPage(i)
        const content = await page.getTextContent()
        const textItems = content.items as any[]
        const strings = textItems.map((it: any) => it.str).join(" ").toLowerCase()
        if (strings.includes(snippet)) {
          return { pageNumber: i, textItems }
        }
      } catch (err) {
        // If we can no longer access the page, bail out gracefully instead of
        // crashing the whole component.
        console.error("PDF getPage failed:", err)
        return { pageNumber: 1, textItems: [] }
      }
    }
    return { pageNumber: 1, textItems: [] }
  }

  // Helper to find text positions within a page for highlighting
  const findTextPositions = (textItems: any[], searchText: string): any[] => {
    const positions: any[] = []
    if (!searchText) return positions
    const joined = textItems.map((it: any) => it.str).join(' ').toLowerCase()
    const search = searchText.toLowerCase().replace(/\s+/g, ' ').trim()
    const idx = joined.indexOf(search)
    if (idx === -1) return positions
    // Fallback: highlight all items that are part of the match
    let charCount = 0
    let start = -1, end = -1
    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i]
      const itemLen = item.str.length + 1 // +1 for space
      if (charCount <= idx && charCount + itemLen > idx) {
        start = i
      }
      if (charCount < idx + search.length && charCount + itemLen >= idx + search.length) {
        end = i
        break
      }
      charCount += itemLen
    }
    if (start !== -1 && end !== -1) {
      for (let i = start; i <= end; i++) positions.push(textItems[i])
    }
    return positions
  }

  const handleIssueClickPdf = async (issue: any) => {
    if (!showPdfViewer) return
    setSelectedIssueId(issue._id)
    setHighlightedText(issue.originalText)

    let pageNum = issuePageMapRef.current[issue._id]
    if (!pageNum) {
      const result = await findPageForText(issue.originalText)
      pageNum = result.pageNumber
      issuePageMapRef.current[issue._id] = pageNum
    }
    setHighlightedPageNumber(pageNum)
    const elem = window.document.getElementById(`page_${pageNum}`)
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Component to render text highlights on PDF pages
  const TextHighlight = ({ pageNumber, searchText }: { pageNumber: number; searchText: string }) => {
    const [highlights, setHighlights] = useState<any[]>([])

    useEffect(() => {
      const findHighlights = async () => {
        if (!pdfDocProxy || !searchText) {
          setHighlights([])
          return
        }

        try {
          const page = await pdfDocProxy.getPage(pageNumber)
          const content = await page.getTextContent()
          const viewport = page.getViewport({ scale: 1 })
          const textItems = content.items as any[]
          const positions = findTextPositions(textItems, searchText)

          const highlightElements = positions.map((item, index) => ({
            id: `highlight-${pageNumber}-${index}`,
            left: (item.transform[4] / viewport.width) * 100,
            top: ((viewport.height - item.transform[5] - item.height) / viewport.height) * 100,
            width: (item.width / viewport.width) * 100,
            height: (item.height / viewport.height) * 100,
          }))

          setHighlights(highlightElements)
        } catch (error) {
          // The PDF page might have been unloaded if the viewer was toggled off
          console.error('Error finding highlights:', error)
          setHighlights([])
        }
      }

      findHighlights()
    }, [pageNumber, searchText])

    return (
      <>
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            className="absolute bg-yellow-300 opacity-50 pointer-events-none rounded-sm"
            style={{
              left: `${highlight.left}%`,
              top: `${highlight.top}%`,
              width: `${highlight.width}%`,
              height: `${highlight.height}%`,
            }}
          />
        ))}
      </>
    )
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
      description: "The document is being re-analyzed. This may take a moment.",
    })
    try {
      await performAnalysis({
        scanId: id as Id<"scans">,
        customRuleIds: selectedRules.length > 0 ? selectedRules : undefined
      })

      setIsAnalyzing(false)
      toast({
        title: "Analysis Complete",
        description: "The document has been successfully re-analyzed.",
      })
      // No need to call router.refresh() - Convex will update automatically
    } catch (error) {
      console.error("Failed to re-analyze document:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      toast({
        title: "Analysis Failed",
        description: `Could not start the re-analysis process: ${errorMessage}`,
        variant: "destructive",
      })
      setIsAnalyzing(false)
    }
  }

  // Define handler for issue status change
  const handleStatusChange = async (issueId: string, newStatus: "open" | "inprogress" | "verified" | "closed" | "false_positive") => {
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

  if (!document) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Document not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowRulesSelector(!showRulesSelector)}
            >
              {showRulesSelector ? "Hide Custom Rules" : "Select Custom Rules"}
            </Button>
            <Button onClick={handleReanalysis} disabled={isAnalyzing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
              {isAnalyzing ? "Analyzing..." : "Re-analyze"}
            </Button>
            <Button variant="outline">
              <Share className="w-4 h-4 mr-2" />
            </Button>
            <Button variant="outline" asChild>
              <a href={document.url} download>
                <Download className="w-4 h-4 mr-2" />
              </a>
            </Button>
          </>
        }
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
            {analysis && <Badge className="text-sm px-3 py-1">{analysis.status || "Analyzed"}</Badge>}
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
              <p>The document is currently being analyzed. This page will update automatically when it's complete.</p>
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
              <p>The document is currently being analyzed. This page will update automatically when it's complete.</p>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className={showPdfViewer ? "lg:col-span-4" : "lg:col-span-3"}>
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="issues">Issues ({issues.length || 0})</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                  <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysis.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
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
                        <Badge variant="destructive">{severityCounts['Critical'] ?? 0}</Badge>
                        <Badge variant="destructive">{severityCounts['High'] ?? 0}</Badge>
                        <Badge variant="secondary">{severityCounts['Medium'] ?? 0}</Badge>
                        <Badge>{severityCounts['Low'] ?? 0}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="pdf-viewer-toggle" checked={showPdfViewer} onCheckedChange={setShowPdfViewer} />
                        <label htmlFor="pdf-viewer-toggle" className="text-sm">PDF Viewer</label>
                      </div>
                    </div>
                  </div>
                  {showPdfViewer ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                      <div ref={viewerContainerRef} className="overflow-auto max-h-[calc(100vh-250px)] border rounded">
                        {isClient && document?.url ? (
                          <PdfDocument
                            file={document.url}
                            onLoadSuccess={(pdf) => {
                              setNumPages(pdf.numPages)
                              setPdfDocProxy(pdf)
                            }}
                            onLoadError={(error) => {
                              console.error("PDF load error:", error)
                            }}
                          >
                            {Array.from({ length: numPages }, (_, i) => (
                              <div key={`page_${i + 1}`} id={`page_${i + 1}`} className="mb-4 flex justify-center relative">
                                <div className="relative">
                                  <Page pageNumber={i + 1} width={600} />
                                  {highlightedText && selectedIssueId && highlightedPageNumber === i + 1 && (
                                    <div className="absolute inset-0">
                                      <TextHighlight pageNumber={i + 1} searchText={highlightedText} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </PdfDocument>
                        ) : (
                          <div className="flex items-center justify-center h-96">
                            <div className="text-gray-500">Loading PDF viewer...</div>
                          </div>
                        )}
                      </div>
                      <div className="border rounded overflow-auto max-h-[calc(100vh-250px)]">
                        {filteredIssues.length === 0 ? (
                          <p className="text-center text-gray-500">
                            {severityFilter === "All" ? "No issues found." : `No ${severityFilter.toLowerCase()} issues found.`}
                          </p>
                        ) : (
                          <ul>
                            {filteredIssues.map((issue: any) => (
                              <li
                                key={issue._id}
                                onClick={() => handleIssueClickPdf(issue)}
                                className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition-colors ${selectedIssueId === issue._id ? 'bg-blue-50 border-blue-200' : ''
                                  }`}
                              >
                                <div className="flex items-start space-x-2">
                                  <Badge
                                    variant={
                                      cap(issue.severity) === "Critical"
                                        ? "destructive"
                                        : cap(issue.severity) === "High"
                                          ? "destructive"
                                          : cap(issue.severity) === "Medium"
                                            ? "secondary"
                                            : "default"
                                    }
                                  >
                                    {cap(issue.severity)}
                                  </Badge>
                                  <span className="text-xs line-clamp-2 flex-1">{issue.originalText}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
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
                        {filteredIssues.map((issue: any) => (
                          <Card key={issue._id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${cap(issue.severity) === "Critical"
                                      ? "bg-red-100"
                                      : cap(issue.severity) === "High"
                                        ? "bg-orange-100"
                                        : cap(issue.severity) === "Medium"
                                          ? "bg-yellow-100"
                                          : "bg-green-100"
                                      }`}
                                  >
                                    {cap(issue.severity) === "Critical" ? (
                                      <AlertTriangle className="w-4 h-4 text-red-500" />
                                    ) : cap(issue.severity) === "High" ? (
                                      <AlertCircle className="w-4 h-4 text-orange-500" />
                                    ) : cap(issue.severity) === "Medium" ? (
                                      <Info className="w-4 h-4 text-yellow-500" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <Badge
                                        variant={
                                          cap(issue.severity) === "Critical"
                                            ? "destructive"
                                            : cap(issue.severity) === "High"
                                              ? "destructive"
                                              : cap(issue.severity) === "Medium"
                                                ? "secondary"
                                                : "default"
                                        }
                                      >
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
                                <p className="text-gray-600 dark:text-white">{issue.issueExplanation}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Suggested Rewrite:</h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <p className="text-black">{issue.suggestedRewrite}</p>
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
                          const sectionData = issues.reduce((acc: Record<string, any>, issue: any) => {
                            const section = issue.section || "Unknown Section";
                            if (!acc[section]) {
                              acc[section] = {
                                issues: [],
                                totalIssues: 0,
                                severityWeights: { critical: 0, high: 0, medium: 0, low: 0 }
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
                              <Button variant="outline" size="sm">
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
                          <li>Paste the text you want to improve in the "Original" box</li>
                          <li>Click "Rewrite Text" to generate an improved version</li>
                          <li>Review the improved version and comprehensibility score</li>
                          <li>Download the rewrite if you're satisfied with the results</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {!showPdfViewer && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Comprehensibility Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComprehensibilityGauge score={analysis.score} />
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
