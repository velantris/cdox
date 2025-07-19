"use client"

import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"
import { DashboardHeader } from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  Info,
  RefreshCw,
  Share
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { use, useEffect, useRef, useState } from "react"

async function getDocumentAndAnalysis(id: string) {
  const response = await fetch(`/api/documents/${id}`)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error("Failed to fetch document data")
  }
  return response.json()
}

export default function DocumentAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [document, setDocument] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string>("All")
  const router = useRouter()
  const { toast } = useToast()
  // Store polling interval to allow cleanup on unmount
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // Calculate counts per severity and filtered issues list
  const severityCounts: Record<string, number> = analysis?.analysis?.issues.reduce((acc: Record<string, number>, issue: any) => {
    const sev = issue.severity
    acc[sev] = (acc[sev] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  const filteredIssues = analysis?.analysis?.issues.filter((issue: any) => severityFilter === "All" || issue.severity === severityFilter) || []

  // Small helper to capitalise first letter
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const adaptIssues = (rawIssues: any[] = []) => {
    return rawIssues.map((issue, index) => {
      // Normalise severity – map grading/score to Critical/High/Medium/Low buckets
      let severity = issue.severity || issue.grading || "Low"
      if (typeof severity === "string") {
        const sev = severity.toLowerCase()
        if (sev === "critical" || sev === "high" || sev === "medium" || sev === "low") {
          severity = cap(sev)
        } else if (sev === "severe") {
          severity = "High"
        } else {
          severity = "Low"
        }
      }

      return {
        status: issue.status || "Open",
        // Fallback chain for each expected property
        severity,
        type: issue.type || issue.issue_type || issue.label || "General",
        section: issue.section || issue.section_category || issue.sectionName || "General",
        original_text: issue.original_text || issue.text || "",
        issue_explanation: issue.issue_explanation || issue.explanation || "",
        suggested_rewrite: issue.suggested_rewrite || issue.suggestedRewrite || "",
        ...issue, // keep any additional fields for future use
        id: issue.id ?? index.toString(),
      }
    })
  }

  const loadData = async () => {
    try {
      const data = await getDocumentAndAnalysis(id)
      if (data) {
        if (data.analysis?.analysis?.issues) {
          data.analysis.analysis.issues = adaptIssues(data.analysis.analysis.issues)
        }
        setDocument(data.document)
        setAnalysis(data.analysis)
      }
    } catch (error) {
      console.error("Failed to fetch document data:", error)
      toast({
        title: "Error",
        description: "Failed to load document and analysis.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleReanalysis = async () => {
    setIsAnalyzing(true)
    toast({
      title: "Analysis Started",
      description: "The document is being re-analyzed. This may take a moment.",
    })
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ doc_id: id }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed to start")
      }

      // Poll for results
      pollIntervalRef.current = setInterval(async () => {
        const newData = await getDocumentAndAnalysis(id)
        if (newData?.analysis?._id !== analysis?._id) {
          setAnalysis(newData.analysis)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setIsAnalyzing(false)
          toast({
            title: "Analysis Complete",
            description: "The document has been successfully re-analyzed.",
          })
          router.refresh()
        }
      }, 5000) // Poll every 5 seconds
    } catch (error) {
      console.error("Failed to re-analyze document:", error)
      toast({
        title: "Analysis Failed",
        description: "Could not start the re-analysis process.",
        variant: "destructive",
      })
      setIsAnalyzing(false)
    }
  }

  // Define handler for issue status change
  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      const data = await response.json();
      if (data.analysis && Array.isArray(data.analysis.analysis.issues)) {
        data.analysis.analysis.issues = adaptIssues(data.analysis.analysis.issues);
      }
      setAnalysis(data.analysis);
      toast({ title: "Status Updated", description: `Status set to ${newStatus}.` });
    } catch (error) {
      console.error("Failed to update issue status:", error);
      toast({ title: "Error", description: "Could not update issue status.", variant: "destructive" });
    }
  };

  // Clear polling interval on component unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading document...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{document.options?.type || "N/A"}</span>
                <span>•</span>
                <span>{new Date(document.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            {analysis && <Badge className="text-sm px-3 py-1">{analysis.status || "Analyzed"}</Badge>}
          </div>
        </div>

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
            <div className="lg:col-span-3">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="issues">Issues ({analysis.analysis.issues.length})</TabsTrigger>
                  <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{analysis.analysis.summary}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysis.analysis.recommendations.map((rec: string, index: number) => (
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
                    <div className="flex space-x-2">
                      <Badge variant="destructive">{severityCounts['Critical'] ?? 0}</Badge>
                      <Badge variant="destructive">{severityCounts['High'] ?? 0}</Badge>
                      <Badge variant="secondary">{severityCounts['Medium'] ?? 0}</Badge>
                      <Badge>{severityCounts['Low'] ?? 0}</Badge>
                    </div>
                  </div>
                  {filteredIssues.length === 0 ? (
                    <p className="text-center text-gray-500">
                      {severityFilter === 'All'
                        ? 'No issues found.'
                        : `No ${severityFilter.toLowerCase()} issues found.`}
                    </p>
                  ) : (
                    <>
                      {filteredIssues.map((issue: any) => (
                        <Card key={issue.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${issue.severity === "Critical"
                                    ? "bg-red-100"
                                    : issue.severity === "High"
                                      ? "bg-orange-100"
                                      : issue.severity === "Medium"
                                        ? "bg-yellow-100"
                                        : "bg-green-100"
                                    }`}
                                >
                                  {issue.severity === "Critical" ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  ) : issue.severity === "High" ? (
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                  ) : issue.severity === "Medium" ? (
                                    <Info className="w-4 h-4 text-yellow-500" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      variant={
                                        issue.severity === "Critical"
                                          ? "destructive"
                                          : issue.severity === "High"
                                            ? "destructive"
                                            : issue.severity === "Medium"
                                              ? "secondary"
                                              : "default"
                                      }
                                    >
                                      {issue.severity}
                                    </Badge>
                                    <Badge variant="outline">{issue.type}</Badge>
                                    <span className="text-sm text-gray-500">{issue.section}</span>
                                  </div>
                                </div>
                              </div>
                              <Select value={issue.status} onValueChange={(val) => handleStatusChange(issue.id, val)}>
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Open">Open</SelectItem>
                                  <SelectItem value="Assigned">Assigned</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Verified">Verified</SelectItem>
                                  <SelectItem value="Closed">Closed</SelectItem>
                                  <SelectItem value="False Positive">False Positive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Original Text:</h4>
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-gray-800">{issue.original_text}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Issue Explanation:</h4>
                              <p className="text-gray-600">{issue.issue_explanation}</p>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Suggested Rewrite:</h4>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-gray-800">{issue.suggested_rewrite}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Comprehensibility Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <ComprehensibilityGauge score={analysis.analysis.score} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Document Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="text-sm font-medium">{document.options?.type || "N/A"}</span>
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
          </div>
        )}
      </div>
    </div>
  )
}