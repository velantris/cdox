"use client"

import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"
import { ConvexLoading } from "@/components/convex-error-boundary"
import { CustomRulesSelector } from "@/components/custom-rules-selector"
import { DashboardHeader } from "@/components/dashboard-header"
import { IssuesList } from "@/components/issues-list"
import { PdfViewer } from "@/components/pdf-viewer"
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
import { use, useState } from "react"

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

  // Handle issue selection for PDF viewer
  const handleIssueClick = (issue: any) => {
    setSelectedIssueId(issue._id)
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
              <Button
                variant="outline"
                onClick={() => setShowRulesSelector(!showRulesSelector)}
              >
                {showRulesSelector ? "Hide Custom Rules" : "Select Custom Rules"}
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
                            (analysis.recommendations as { heading: string, points: string[], priority: "low" | "medium" | "high" }[]).sort((a, b) => {
                              if (a.priority === "high") return -1;
                              if (a.priority === "medium") return 0;
                              return 1;
                            }).map((rec, index) => (
                              <li key={index} className="flex items-start space-x-3">
                                <CheckCircle className={`w-5 h-5 text-green-500 mt-0.5 flex-shrink-0 ${rec.priority === "high" ? "text-red-500" : rec.priority === "medium" ? "text-yellow-500" : "text-green-500"}`} />
                                <span className="text-black dark:text-white ">{rec.heading}</span>
                                <ul className="list-disc list-inside">
                                  {rec.points.map((point, pointIndex) => (
                                    <li key={pointIndex} className="text-black dark:text-white ">{point}</li>
                                  ))}
                                </ul>
                              </li>
                            ))
                          )
                        ) : null}
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
                          <a href={document?.url ?? '#'} download>
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                  {showPdfViewer ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                      <PdfViewer
                        documentUrl={document?.url || ''}
                        selectedIssue={issues.find(issue => issue._id === selectedIssueId)}
                        onIssueSelect={handleIssueClick}
                        issues={issues}
                      />
                      <IssuesList
                        issues={issues}
                        selectedIssueId={selectedIssueId}
                        onIssueClick={handleIssueClick}
                        severityFilter={severityFilter}
                      />
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
