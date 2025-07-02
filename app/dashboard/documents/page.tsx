import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Upload, Search, ExternalLink, Download, MoreHorizontal } from "lucide-react"
import Link from "next/link"

const documents = [
  {
    id: "doc-001",
    title: "Terms & Conditions v4.2",
    type: "Terms & Conditions",
    score: 68,
    grade: "C+",
    status: "In Review",
    lastUpdated: "2025-01-02T10:30:00Z",
    assignedTo: "Legal Team",
    issues: 12,
    version: "v4.2",
    size: "2.4 MB",
  },
  {
    id: "doc-002",
    title: "Privacy Policy GDPR Update",
    type: "Privacy Policy",
    score: 82,
    grade: "A-",
    status: "Approved",
    lastUpdated: "2025-01-01T14:20:00Z",
    assignedTo: "Compliance Team",
    issues: 3,
    version: "v2.1",
    size: "1.8 MB",
  },
  {
    id: "doc-003",
    title: "Loan Agreement Template",
    type: "Loan Agreement",
    score: 45,
    grade: "D",
    status: "Needs Work",
    lastUpdated: "2024-12-30T09:15:00Z",
    assignedTo: "Legal Team",
    issues: 28,
    version: "v1.5",
    size: "3.2 MB",
  },
  {
    id: "doc-004",
    title: "Fee Schedule 2025",
    type: "Fee Schedule",
    score: 91,
    grade: "A+",
    status: "Published",
    lastUpdated: "2024-12-28T16:45:00Z",
    assignedTo: "Product Team",
    issues: 1,
    version: "v1.0",
    size: "0.9 MB",
  },
  {
    id: "doc-005",
    title: "Account Opening Procedures",
    type: "Procedures",
    score: 76,
    grade: "B+",
    status: "In Review",
    lastUpdated: "2024-12-27T11:30:00Z",
    assignedTo: "Operations Team",
    issues: 8,
    version: "v3.0",
    size: "1.5 MB",
  },
  {
    id: "doc-006",
    title: "Investment Disclosure MiFID II",
    type: "Regulatory Disclosure",
    score: 59,
    grade: "D+",
    status: "Needs Work",
    lastUpdated: "2024-12-25T13:20:00Z",
    assignedTo: "Compliance Team",
    issues: 19,
    version: "v2.3",
    size: "2.1 MB",
  },
]

export default function DocumentsPage() {
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
          <p className="text-gray-600">Manage and analyze your legal documents</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search documents..." className="pl-10" />
                </div>
              </div>
              <div className="flex gap-2">
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="terms">Terms & Conditions</SelectItem>
                    <SelectItem value="privacy">Privacy Policy</SelectItem>
                    <SelectItem value="loan">Loan Agreement</SelectItem>
                    <SelectItem value="fee">Fee Schedule</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="review">In Review</SelectItem>
                    <SelectItem value="needs-work">Needs Work</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="excellent">80-100</SelectItem>
                    <SelectItem value="good">60-79</SelectItem>
                    <SelectItem value="poor">0-59</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Documents ({documents.length})</CardTitle>
            <CardDescription>Complete list of analyzed documents with comprehensibility scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.title}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{doc.version}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>{new Date(doc.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Assigned to: {doc.assignedTo}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{doc.score}</div>
                      <Badge
                        variant={doc.score >= 80 ? "default" : doc.score >= 60 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {doc.grade}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-medium">{doc.issues}</div>
                      <div className="text-xs text-gray-500">issues</div>
                    </div>
                    <Badge
                      variant={
                        doc.status === "Published"
                          ? "default"
                          : doc.status === "Approved"
                            ? "secondary"
                            : doc.status === "In Review"
                              ? "outline"
                              : "destructive"
                      }
                      className="min-w-20 justify-center"
                    >
                      {doc.status}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Link href={`/dashboard/documents/${doc.id}`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Analyze
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
