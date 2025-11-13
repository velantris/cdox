"use client"

import { ConvexLoading } from "@/components/convex-error-boundary"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import { FileText, Search, Upload } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

// Helper to map score to letter grade
const gradeForScore = (score: number | undefined) => {
  if (score === undefined || score === null) return "-"
  if (score >= 90) return "A+"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return "F"
}

// Helper to map document type to display name
const getDisplayType = (type: string) => {
  const typeMap: Record<string, string> = {
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    loan: "Loan Agreement",
    fee: "Fee Schedule",
    disclosure: "Disclosure",
    other: "Other Document"
  }
  return typeMap[type] || type
}

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")

  // Fetch scans with analysis data using optimized Convex query
  const scansQuery = useQuery(api.scans.getScansWithAnalysisData, { limit: 100 })
  const scansWithData = useMemo(() => scansQuery || [], [scansQuery])

  // Process documents with analysis and issues data
  const documents = useMemo(() => {
    return scansWithData.map((scanData: any) => {
      const { latestAnalysis, issueCount, ...scan } = scanData
      const score = latestAnalysis?.score

      return {
        id: scan._id,
        title: scan.name,
        type: scan.documentType || "other", // Use actual documentType value
        score: score,
        grade: gradeForScore(score),
        status: latestAnalysis ? "Analyzed" : "Uploaded",
        lastUpdated: new Date(scan.createdAt),
        assignedTo: "—", // TBD when assignment feature exists
        issues: issueCount,
        version: "—", // Not stored in scan model yet
        size: "—", // File size not stored in scan model
      }
    })
  }, [scansWithData])

  // Filter documents based on search and filters
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: any) => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase())

      // Fix type filter to match actual documentType values
      const matchesType = typeFilter === "all" || doc.type.toLowerCase() === typeFilter.toLowerCase()

      // Fix status filter to match actual status values
      const matchesStatus = statusFilter === "all" || doc.status.toLowerCase() === statusFilter.toLowerCase()

      // Score filter logic (this was already correct)
      const matchesScore = scoreFilter === "all" ||
        (scoreFilter === "excellent" && typeof doc.score === "number" && doc.score >= 80) ||
        (scoreFilter === "good" && typeof doc.score === "number" && doc.score >= 60 && doc.score < 80) ||
        (scoreFilter === "poor" && typeof doc.score === "number" && doc.score < 60)

      return matchesSearch && matchesType && matchesStatus && matchesScore
    })
  }, [documents, searchTerm, typeFilter, statusFilter, scoreFilter])

  // Show loading state
  if (scansWithData === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold text-foreground">CDox</span>
                </Link>
              </div>
            </div>
          </div>
        </header>
        <div className="p-6">
          <ConvexLoading message="Loading documents..." />
        </div>
      </div>
    )
  }

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
                <span className="text-xl font-bold text-foreground">CDox</span>
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
              <Link href="/dashboard/doc-new">
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
                  <Input
                    placeholder="Search documents..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="terms">Terms</SelectItem>
                    <SelectItem value="privacy">Privacy</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="disclosure">Disclosure</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="analyzed">Analyzed</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scoreFilter} onValueChange={setScoreFilter}>
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
            <CardTitle>All Documents ({filteredDocuments.length})</CardTitle>
            <CardDescription>Complete list of analyzed documents with comprehensibility scores</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500 mb-6">
                  {documents.length === 0
                    ? "Upload your first document to get started with analysis"
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
                {documents.length === 0 && (
                  <Link href="/dashboard/doc-new">
                    <Button>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc: any) => (
                  <Link href={`/dashboard/documents/${doc.id}`} key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{doc.title}</h4>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{getDisplayType(doc.type)}</span>
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
                        <div className="text-2xl font-bold">{doc.score ?? "-"}</div>
                        <Badge
                          variant={
                            typeof doc.score === "number"
                              ? doc.score >= 80
                                ? "default"
                                : doc.score >= 60
                                  ? "secondary"
                                  : "destructive"
                              : "outline"
                          }
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
                          doc.status === "Analyzed"
                            ? "default"
                            : doc.status === "Uploaded"
                              ? "secondary"
                              : "outline"
                        }
                        className="min-w-20 justify-center"
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
