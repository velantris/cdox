import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"
import { DashboardHeader } from "@/components/dashboard-header"
import { IssuesSummary, IssueSummaryItem } from "@/components/issues-summary"
import { RecentDoc, RecentDocuments } from "@/components/recent-documents"
import { TeamActivity } from "@/components/team-activity"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  FileText,
  Info,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react"
import Link from "next/link"

import connectDB from "@/lib/db/client"
import { Analysis, Document } from "@/lib/db/models"

// Helper to map score to letter grade
const gradeForScore = (score: number | undefined) => {
  if (score === undefined || score === null) return "N/A"
  if (score >= 90) return "A+"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return "F"
}

// Simple relative time helper (hours/days ago etc.)
const getRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

export default async function DashboardPage() {
  await connectDB()

  // Fetch documents (limit recent 20 for speed)
  const documents = (await Document.find({}).sort({ createdAt: -1 }).limit(20).lean()) as any[]

  // Fetch analyses for those documents
  const docIds = documents.map((d) => d.doc_id)
  const analyses = (await Analysis.find({ doc_id: { $in: docIds } })
    .sort({ createdAt: -1 })
    .lean()) as any[]

  // Keep only the latest analysis per document
  const latestAnalysisMap = new Map<string, any>()
  for (const a of analyses) {
    if (!latestAnalysisMap.has(a.doc_id)) {
      latestAnalysisMap.set(a.doc_id, a)
    }
  }

  // Key metrics calculations
  const totalDocuments = documents.length

  const scores: number[] = []
  let criticalIssues = 0
  let highIssues = 0
  let mediumIssues = 0
  let lowIssues = 0

  // Fetch all issues for the analyses we have
  const analysisIds = Array.from(latestAnalysisMap.values())
    .map(a => a.analysis_id)
    .filter(id => id !== undefined && id !== null);
  let allIssues: any[] = [];

  if (analysisIds.length > 0) {
    try {
      const issuesPromises = analysisIds.map(async (analysisId) => {
        const response = await fetch(`/api/issues?analysis_id=${analysisId}`);
        if (response.ok) {
          const data = await response.json();
          return data.issues || [];
        }
        return [];
      });
      
      const issuesArrays = await Promise.all(issuesPromises);
      allIssues = issuesArrays.flat();
    } catch (error) {
      console.error("Failed to fetch issues for dashboard:", error);
    }
  }

  for (const analysis of latestAnalysisMap.values()) {
    const score = analysis.analysis?.score
    if (typeof score === "number") {
      scores.push(score)
    }
  }

  for (const issue of allIssues) {
    let severity: string = (issue.severity || "Low").toString().toLowerCase();
    if (severity === "critical") criticalIssues += 1;
    else if (severity === "high" || severity === "severe") highIssues += 1;
    else if (severity === "medium") mediumIssues += 1;
    else lowIssues += 1;
  }

  const averageScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  const excellentDocs = scores.filter((s) => s >= 80).length
  const goodDocs = scores.filter((s) => s >= 60 && s < 80).length
  const needsWorkDocs = scores.filter((s) => s < 60).length

  // Team members count (unique userId across docs)
  const teamMembers = new Set<string>(documents.map((d) => d.userId))

  // Prepare recent documents (up to 4)
  const recentDocs: RecentDoc[] = documents.slice(0, 4).map((doc) => {
    const a = latestAnalysisMap.get(doc.doc_id);
    const score: number | undefined = a?.analysis?.score;
    
    const docIssues = a?.analysis_id ? allIssues.filter(issue => issue.analysis_id === a.analysis_id) : [];
    
    return {
      id: doc.doc_id,
      title: doc.title,
      type: doc.options?.type || "N/A",
      score,
      grade: score !== undefined ? gradeForScore(score) : "N/A",
      status: a ? "Analyzed" : "Pending",
      lastUpdated: getRelativeTime(doc.updatedAt || doc.createdAt),
      assignedTo: "Legal Team", // placeholder until assignment feature exists
      issues: docIssues.length,
    };
  })

  // Build issues summary array for component
  const issuesData: IssueSummaryItem[] = [
    {
      type: "Critical",
      count: criticalIssues,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-50",
      description: "Legal jargon, ambiguous clauses",
    },
    {
      type: "High",
      count: highIssues,
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      description: "Complex sentences, unclear terms",
    },
    {
      type: "Medium",
      count: mediumIssues,
      icon: Info,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      description: "Formatting, readability improvements",
    },
    {
      type: "Low",
      count: lowIssues,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-50",
      description: "Minor suggestions, style improvements",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, Legal Team</h1>
          <p className="text-muted-foreground">
            Here's an overview of your document comprehensibility analysis
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
              {/* TODO: add trend over time */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{criticalIssues}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Document Analysis</CardTitle>
                <CardDescription>
                  Latest comprehensibility scores and status updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentDocuments docs={recentDocs} />
              </CardContent>
            </Card>

            {/* Issues Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Issues Overview</CardTitle>
                <CardDescription>Current issues by severity and type</CardDescription>
              </CardHeader>
              <CardContent>
                <IssuesSummary data={issuesData} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Comprehensibility Score */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Score</CardTitle>
                <CardDescription>
                  Average comprehensibility across all documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComprehensibilityGauge score={averageScore} />
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Excellent (80-100)</span>
                    <span>{excellentDocs} docs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Good (60-79)</span>
                    <span>{goodDocs} docs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Needs Work (&lt;60)</span>
                    <span>{needsWorkDocs} docs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Activity – still mocked for now */}
            <Card>
              <CardHeader>
                <CardTitle>Team Activity</CardTitle>
                <CardDescription>Recent actions and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <TeamActivity />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/doc-new">
                  <Button className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Document
                  </Button>
                </Link>
                <Link href="/dashboard/documents">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <FileText className="w-4 h-4 mr-2" />
                    View All Documents
                  </Button>
                </Link>
                <Link href="/dashboard/settings">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Configure Rules
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
