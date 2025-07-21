"use client"

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
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { ConvexLoading } from "@/components/convex-error-boundary"

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

export default function DashboardPage() {
  // Fetch dashboard data using optimized Convex query
  const dashboardData = useQuery(api.scans.getDashboardData, { limit: 20 })

  // Extract data from the response
  const scans = dashboardData?.scans || []
  const stats = dashboardData?.stats || {
    totalScans: 0,
    totalAnalyses: 0,
    totalIssues: 0,
    averageScore: 0,
    issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 }
  }

  // Key metrics calculations
  const totalDocuments = stats.totalScans
  const averageScore = stats.averageScore
  const criticalIssues = stats.issuesBySeverity.critical
  const highIssues = stats.issuesBySeverity.high
  const mediumIssues = stats.issuesBySeverity.medium
  const lowIssues = stats.issuesBySeverity.low

  // Calculate score distribution
  const scores = scans
    .filter((scan: any) => scan.latestAnalysis?.score !== undefined)
    .map((scan: any) => scan.latestAnalysis.score)

  const excellentDocs = scores.filter((s: number) => s >= 80).length
  const goodDocs = scores.filter((s: number) => s >= 60 && s < 80).length
  const needsWorkDocs = scores.filter((s: number) => s < 60).length

  // Team members count (placeholder since we removed user management)
  const teamMembers = new Set<string>(["team-member-1", "team-member-2", "team-member-3"])

  // Prepare recent documents (up to 4)
  const recentDocs: RecentDoc[] = scans.length > 0 ? scans.slice(0, 4).map((scanData: any) => {
    const { latestAnalysis, issueCount, ...scan } = scanData
    const score: number | undefined = latestAnalysis?.score

    return {
      id: scan._id,
      title: scan.name,
      type: scan.documentType || "N/A",
      score,
      grade: score !== undefined ? gradeForScore(score) : "N/A",
      status: latestAnalysis ? "Analyzed" : "Pending",
      lastUpdated: getRelativeTime(new Date(scan.createdAt)),
      assignedTo: "Legal Team", // placeholder until assignment feature exists
      issues: issueCount,
    }
  }) : []

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

  // Show loading state while data is being fetched
  if (dashboardData === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="p-6">
          <ConvexLoading message="Loading dashboard..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, Legal Team</h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your document comprehensibility analysis
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
