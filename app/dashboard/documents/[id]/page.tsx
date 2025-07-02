import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ArrowLeft,
  Download,
  Share,
  Edit,
  MessageSquare,
  User,
  Clock,
  Flag,
} from "lucide-react"
import Link from "next/link"
import { ComprehensibilityGauge } from "@/components/comprehensibility-gauge"

// Mock data for the document analysis
const documentData = {
  id: "doc-001",
  title: "Terms & Conditions v4.2",
  type: "Terms & Conditions",
  score: 68,
  grade: "C+",
  status: "In Review",
  lastUpdated: "2025-01-02T10:30:00Z",
  assignedTo: "Legal Team",
  version: "v4.2",
  size: "2.4 MB",
  summary:
    "The document contains several areas of legal jargon and complex sentence structures that may be difficult for average consumers to understand. Key issues include ambiguous liability clauses and unclear termination procedures.",
  sections: [
    { id: "section-1", name: "Introduction", score: 85, issues: 2 },
    { id: "section-2", name: "Account Terms", score: 72, issues: 5 },
    { id: "section-3", name: "Liability Clauses", score: 45, issues: 8 },
    { id: "section-4", name: "Termination", score: 58, issues: 6 },
    { id: "section-5", name: "Dispute Resolution", score: 76, issues: 3 },
    { id: "section-6", name: "Contact Information", score: 92, issues: 1 },
  ],
  issues: [
    {
      id: "issue-001",
      section: "Liability Clauses",
      type: "Legal Jargon",
      severity: "Critical",
      text: "The bank shall not be held liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the services.",
      explanation:
        "Terms like 'consequential damages' and 'punitive damages' are legal jargon that average consumers may not understand.",
      suggestedRewrite:
        "The bank is not responsible for any losses that happen indirectly because of our services, such as lost profits or business opportunities.",
      legalMeaningChange: false,
      assignedTo: "legal-team",
      status: "Open",
      comments: 3,
    },
    {
      id: "issue-002",
      section: "Termination",
      type: "Ambiguity",
      severity: "High",
      text: "The bank reserves the right to terminate this agreement at its sole discretion with reasonable notice.",
      explanation:
        "The phrase 'sole discretion' and 'reasonable notice' are vague and could be interpreted differently.",
      suggestedRewrite:
        "The bank may end this agreement by giving you 30 days written notice. We will explain our reasons for ending the agreement.",
      legalMeaningChange: true,
      assignedTo: "compliance-team",
      status: "In Progress",
      comments: 1,
    },
    {
      id: "issue-003",
      section: "Account Terms",
      type: "Complex Sentence",
      severity: "Medium",
      text: "Notwithstanding any provision to the contrary herein, the customer acknowledges and agrees that all transactions are subject to applicable laws and regulations.",
      explanation: "This sentence uses complex legal language and could be simplified for better understanding.",
      suggestedRewrite:
        "All transactions must follow the law, even if other parts of this agreement say something different.",
      legalMeaningChange: false,
      assignedTo: "legal-team",
      status: "Open",
      comments: 0,
    },
  ],
  recommendations: [
    "Replace legal jargon with plain language equivalents",
    "Break long sentences into shorter, clearer statements",
    "Define technical terms when first used",
    "Use active voice instead of passive voice",
    "Add examples to clarify complex concepts",
  ],
}

export default function DocumentAnalysisPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">ClearDoc</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/dashboard/documents" className="text-blue-600 font-medium">
                  Documents
                </Link>
                <Link href="/dashboard/teams" className="text-gray-600 hover:text-gray-900">
                  Teams
                </Link>
                <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard/documents" className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{documentData.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{documentData.type}</span>
                <span>•</span>
                <span>{documentData.version}</span>
                <span>•</span>
                <span>{documentData.size}</span>
                <span>•</span>
                <span>Last updated {new Date(documentData.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge
              variant={
                documentData.status === "Published"
                  ? "default"
                  : documentData.status === "Approved"
                    ? "secondary"
                    : documentData.status === "In Review"
                      ? "outline"
                      : "destructive"
              }
              className="text-sm px-3 py-1"
            >
              {documentData.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="issues">Issues ({documentData.issues.length})</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{documentData.summary}</p>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>Key improvements to enhance document comprehensibility</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {documentData.recommendations.map((rec, index) => (
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
                {documentData.issues.map((issue) => (
                  <Card key={issue.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              issue.severity === "Critical"
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
                        <div className="flex items-center space-x-2">
                          <Badge variant={issue.status === "Open" ? "destructive" : "secondary"}>{issue.status}</Badge>
                          <Button size="sm" variant="ghost">
                            <MessageSquare className="w-4 h-4" />
                            {issue.comments}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Original Text:</h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-gray-800">{issue.text}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Issue Explanation:</h4>
                        <p className="text-gray-600">{issue.explanation}</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Suggested Rewrite:</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-gray-800">{issue.suggestedRewrite}</p>
                        </div>
                        {issue.legalMeaningChange && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Flag className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-orange-600">Legal review required - meaning may change</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <User className="w-4 h-4" />
                          <span>Assigned to {issue.assignedTo}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button size="sm">Accept Rewrite</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="heatmap" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Section Heatmap</CardTitle>
                    <CardDescription>Comprehensibility scores by document section</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documentData.sections.map((section) => (
                        <div key={section.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{section.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">{section.issues} issues</span>
                              <Badge
                                variant={
                                  section.score >= 80 ? "default" : section.score >= 60 ? "secondary" : "destructive"
                                }
                              >
                                {section.score}
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={section.score}
                            className={`h-3 ${
                              section.score >= 80
                                ? "text-green-500"
                                : section.score >= 60
                                  ? "text-blue-500"
                                  : "text-red-500"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rewrite" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Rewrite</CardTitle>
                    <CardDescription>AI-generated improved version with better comprehensibility</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3">Original</h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 h-96 overflow-y-auto">
                          <p className="text-sm text-gray-800">
                            The bank shall not be held liable for any indirect, incidental, special, consequential, or
                            punitive damages arising out of or relating to your use of the services, notwithstanding any
                            provision to the contrary herein...
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Improved Version</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 h-96 overflow-y-auto">
                          <p className="text-sm text-gray-800">
                            The bank is not responsible for any losses that happen indirectly because of our services,
                            such as lost profits or business opportunities. This applies even if other parts of this
                            agreement say something different...
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-500">Comprehensibility improved from 68 to 84 (+16 points)</div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Download Rewrite
                        </Button>
                        <Button>Apply Changes</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Score Card */}
            <Card>
              <CardHeader>
                <CardTitle>Comprehensibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ComprehensibilityGauge score={documentData.score} />
              </CardContent>
            </Card>

            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Type:</span>
                  <span className="text-sm font-medium">{documentData.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Version:</span>
                  <span className="text-sm font-medium">{documentData.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Size:</span>
                  <span className="text-sm font-medium">{documentData.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Assigned to:</span>
                  <span className="text-sm font-medium">{documentData.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last updated:</span>
                  <span className="text-sm font-medium">{new Date(documentData.lastUpdated).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Issues Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Issues Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Critical</span>
                  </div>
                  <span className="text-sm font-medium">
                    {documentData.issues.filter((i) => i.severity === "Critical").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">High</span>
                  </div>
                  <span className="text-sm font-medium">
                    {documentData.issues.filter((i) => i.severity === "High").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Medium</span>
                  </div>
                  <span className="text-sm font-medium">
                    {documentData.issues.filter((i) => i.severity === "Medium").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Low</span>
                  </div>
                  <span className="text-sm font-medium">
                    {documentData.issues.filter((i) => i.severity === "Low").length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Document
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Clock className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
