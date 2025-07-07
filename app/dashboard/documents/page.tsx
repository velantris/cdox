import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import connectDB from "@/lib/db/client"
import { Document as DocModel } from "@/lib/db/models"
import { Download, ExternalLink, FileText, MoreHorizontal, Search, Upload } from "lucide-react"
import Link from "next/link"

// Ensure this page is always rendered dynamically so we get fresh data
export const dynamic = "force-dynamic"

// Helper to fetch documents from the API and massage the data into the UI-friendly
// shape that this component expects. In a future refactor we can tighten the
// UI to the real schema, but for now we keep the existing table layout.
async function getDocuments() {
  await connectDB()

  const docs = (await DocModel.find({}).sort({ createdAt: -1 }).lean()) as any[]

  const mapToUi = (doc: any) => ({
    id: doc.doc_id,
    title: doc.title,
    type: doc.options?.type ?? "Document",
    score: 0,
    grade: "-",
    status: "Uploaded",
    lastUpdated: doc.updatedAt ?? doc.createdAt,
    assignedTo: "—",
    issues: 0,
    version: "—",
    size: "—",
  })

  return docs.map(mapToUi)
}

export default async function DocumentsPage() {
  const documents = await getDocuments()

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
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/dashboard/documents" className="text-primary font-medium">
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
          <p className="text-muted-foreground">Manage and analyze your legal documents</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                      <h4 className="font-medium text-foreground">{doc.title}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{doc.version}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>{new Date(doc.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Assigned to: {doc.assignedTo}</div>
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
                      <div className="text-xs text-muted-foreground">issues</div>
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
