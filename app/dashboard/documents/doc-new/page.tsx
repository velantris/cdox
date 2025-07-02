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

// Mock data for the newly uploaded document
const newDocumentData = {
  id: "doc-new",
  title: "Customer Account Agreement v2.1",
  type: "Account Agreement",
  score: 72,
  grade: "B-",
  status: "Analysis Complete",
  lastUpdated: "2025-01-02T14:30:00Z",
  assignedTo: "Legal Team",
  version: "v2.1",
  size: "1.8 MB",
  summary:
    "This newly analyzed document shows good overall comprehensibility with some areas for improvement. The document successfully avoids most legal jargon but contains several complex sentence structures that could be simplified for better customer understanding.",
  sections: [
    { id: "section-1", name: "Account Opening", score: 88, issues: 1 },
    { id: "section-2", name: "Account Features", score: 79, issues: 3 },
    { id: "section-3", name: "Fees and Charges", score: 65, issues: 4 },
    { id: "section-4", name: "Terms of Use", score: 58, issues: 7 },
    { id: "section-5", name: "Privacy Notice", score: 84, issues: 2 },
    { id: "section-6", name: "Contact Details", score: 95, issues: 0 },
  ],
  issues: [
    {
      id: "issue-new-001",
      section: "Terms of Use",
      type: "Complex Sentence",
      severity: "High",
      text: "In the event that the customer fails to maintain the minimum balance requirements as specified herein, the bank reserves the right to impose applicable fees and charges as outlined in the fee schedule, notwithstanding any other provisions contained within this agreement.",
      explanation:
        "This sentence is overly complex with multiple clauses and legal terminology that may confuse customers.",
      suggestedRewrite:
        "If your account balance falls below the minimum requirement, we may charge fees as shown in our fee schedule.",
      legalMeaningChange: false,
      assignedTo: "legal-team",
      status: "Open",
      comments: 0,
    },
    {
      id: "issue-new-002",
      section: "Fees and Charges",
      type: "Ambiguity",
      severity: "Medium",
      text: "Additional charges may apply for certain transactions at the bank's discretion.",
      explanation:
        "The phrase 'may apply' and 'bank's discretion' creates uncertainty about when fees will be charged.",
      suggestedRewrite:
        "We charge additional fees for international transfers, expedited processing, and paper statements. See our complete fee list for details.",
      legalMeaningChange: true,
      assignedTo: "compliance-team",
      status: "Open",
      comments: 0,
    },
    {
      id: "issue-new-003",
      section: "Account Features",
      type: "Technical Jargon",
      severity: "Medium",
      text: "The account provides real-time transaction processing with end-to-end encryption and multi-factor authentication protocols.",
      explanation:
        "Technical terms like 'end-to-end encryption' and 'multi-factor authentication protocols' may not be understood by all customers.",
      suggestedRewrite:
        "Your account processes transactions instantly and uses advanced security measures to protect your information, including secure passwords and identity verification.",
      legalMeaningChange: false,
      assignedTo: "legal-team",
      status: "Open",
      comments: 0,
    },
  ],
  recommendations: [
    "Simplify complex sentence structures by breaking them into shorter statements",
    "Replace technical jargon with customer-friendly explanations",
    "Provide specific examples instead of vague terms like 'may apply'",
    "Use active voice to make statements more direct and clear",
    "Add a glossary section for any necessary technical terms",
  ],
}

export default function NewDocumentAnalysisPage() {
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{newDocumentData.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{newDocumentData.type}</span>
                <span>•</span>
                <span>{newDocumentData.version}</span>
                <span>•</span>
                <span>{newDocumentData.size}</span>
                <span>•</span>
                <span>Analyzed {new Date(newDocumentData.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
            <Badge variant="default" className="text-sm px-3 py-1 bg-green-600">
              {newDocumentData.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="issues">Issues ({newDocumentData.issues.length})</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Analysis Complete Banner */}
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-medium text-green-900">Analysis Complete!</h3>
                        <p className="text-green-700">
                          Your document has been successfully analyzed and is ready for review.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{newDocumentData.summary}</p>
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
                      {newDocumentData.recommendations.map((rec, index) => (
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
                {newDocumentData.issues.map((issue) => (
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
                          <Badge variant="destructive">{issue.status}</Badge>
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
                      {newDocumentData.sections.map((section) => (
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
                            In the event that the customer fails to maintain the minimum balance requirements as
                            specified herein, the bank reserves the right to impose applicable fees and charges as
                            outlined in the fee schedule, notwithstanding any other provisions contained within this
                            agreement...
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Improved Version</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 h-96 overflow-y-auto">
                          <p className="text-sm text-gray-800">
                            If your account balance falls below the minimum requirement, we may charge fees as shown in
                            our fee schedule. Your account processes transactions instantly and uses advanced security
                            measures to protect your information...
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-500">Comprehensibility improved from 72 to 86 (+14 points)</div>
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
                <ComprehensibilityGauge score={newDocumentData.score} />
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
                  <span className="text-sm font-medium">{newDocumentData.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Version:</span>
                  <span className="text-sm font-medium">{newDocumentData.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Size:</span>
                  <span className="text-sm font-medium">{newDocumentData.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Assigned to:</span>
                  <span className="text-sm font-medium">{newDocumentData.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Analyzed:</span>
                  <span className="text-sm font-medium">
                    {new Date(newDocumentData.lastUpdated).toLocaleDateString()}
                  </span>
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
                    {newDocumentData.issues.filter((i) => i.severity === "Critical").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">High</span>
                  </div>
                  <span className="text-sm font-medium">
                    {newDocumentData.issues.filter((i) => i.severity === "High").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Medium</span>
                  </div>
                  <span className="text-sm font-medium">
                    {newDocumentData.issues.filter((i) => i.severity === "Medium").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Low</span>
                  </div>
                  <span className="text-sm font-medium">
                    {newDocumentData.issues.filter((i) => i.severity === "Low").length}
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
