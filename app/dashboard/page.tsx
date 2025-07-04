import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"
import { IssuesSummary } from "@/components/issues-summary"
import { RecentDocuments } from "@/components/recent-documents"
import { TeamActivity } from "@/components/team-activity"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, BarChart3, FileText, TrendingUp, Upload, Users } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">ClearDoc</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-primary font-medium">
                  Dashboard
                </Link>
                <Link href="/dashboard/documents" className="text-muted-foreground hover:text-foreground">
                  Documents
                </Link>
                <Link href="/dashboard/teams" className="text-muted-foreground hover:text-foreground">
                  Teams
                </Link>
                <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/dashboard/upload">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, Legal Team</h1>
          <p className="text-muted-foreground">Here's an overview of your document comprehensibility analysis</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">247</div>
              <p className="text-xs text-muted-foreground">+12 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">73</div>
              <p className="text-xs text-muted-foreground">+5.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">-8 from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Active this week</p>
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
                <CardDescription>Latest comprehensibility scores and status updates</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentDocuments />
              </CardContent>
            </Card>

            {/* Issues Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Issues Overview</CardTitle>
                <CardDescription>Current issues by severity and type</CardDescription>
              </CardHeader>
              <CardContent>
                <IssuesSummary />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Comprehensibility Score */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Score</CardTitle>
                <CardDescription>Average comprehensibility across all documents</CardDescription>
              </CardHeader>
              <CardContent>
                <ComprehensibilityGauge score={73} />
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Excellent (80-100)</span>
                    <span>45 docs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Good (60-79)</span>
                    <span>128 docs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Needs Work ({"<"}60)</span>
                    <span>74 docs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Activity */}
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
                <Link href="/dashboard/upload">
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
