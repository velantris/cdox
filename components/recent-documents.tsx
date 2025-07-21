import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText } from "lucide-react"
import Link from "next/link"

// Allow external callers to provide their own document list while preserving
// the current mocked data as a sensible fallback.

export interface RecentDoc {
  id: string
  title: string
  type?: string
  score?: number
  grade?: string
  status?: string
  lastUpdated?: string
  assignedTo?: string
  issues?: number
}

const recentDocs: RecentDoc[] = [
  {
    id: "doc-001",
    title: "Terms & Conditions v4.2",
    type: "Terms & Conditions",
    score: 68,
    grade: "C+",
    status: "In Review",
    lastUpdated: "2 hours ago",
    assignedTo: "Legal Team",
    issues: 12,
  },
  {
    id: "doc-002",
    title: "Privacy Policy GDPR Update",
    type: "Privacy Policy",
    score: 82,
    grade: "A-",
    status: "Approved",
    lastUpdated: "1 day ago",
    assignedTo: "Compliance Team",
    issues: 3,
  },
  {
    id: "doc-003",
    title: "Loan Agreement Template",
    type: "Loan Agreement",
    score: 45,
    grade: "D",
    status: "Needs Work",
    lastUpdated: "3 days ago",
    assignedTo: "Legal Team",
    issues: 28,
  },
  {
    id: "doc-004",
    title: "Fee Schedule 2025",
    type: "Fee Schedule",
    score: 91,
    grade: "A+",
    status: "Published",
    lastUpdated: "1 week ago",
    assignedTo: "Product Team",
    issues: 1,
  },
]

export function RecentDocuments({ docs }: { docs?: RecentDoc[] }) {
  const data = docs && docs.length > 0 ? docs : []

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No documents yet</p>
        <p className="text-sm text-gray-400">Upload your first document to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{doc.title}</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{doc.type}</span>
                <span>•</span>
                <span>{doc.lastUpdated}</span>
                <span>•</span>
                <span>{doc.assignedTo}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-lg font-bold">{doc.score}</div>
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
              <div className="text-sm font-medium">{doc.issues}</div>
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
            >
              {doc.status}
            </Badge>
            <Link href={`/dashboard/documents/${doc.id}`}>
              <Button size="sm" variant="ghost">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
