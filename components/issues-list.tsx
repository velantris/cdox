"use client"

import { Badge } from "@/components/ui/badge"

interface IssuesListProps {
    issues: any[]
    selectedIssueId: string | null
    onIssueClick: (issue: any) => void
    severityFilter: string
}

export function IssuesList({ issues, selectedIssueId, onIssueClick, severityFilter }: IssuesListProps) {
    // Map severity levels to color classes
    const severityClass = (severity: string) => {
        const sev = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()
        switch (sev) {
            case "Critical":
                return "bg-red-500 text-white"
            case "High":
                return "bg-orange-500 text-white"
            case "Medium":
                return "bg-yellow-500 text-black"
            case "Low":
            default:
                return "bg-green-500 text-white"
        }
    }

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    const filteredIssues = issues.filter((issue: any) =>
        severityFilter === "All" ||
        issue.severity.toLowerCase() === severityFilter.toLowerCase()
    )

    if (filteredIssues.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                {severityFilter === "All" ? "No issues found." : `No ${severityFilter.toLowerCase()} issues found.`}
            </div>
        )
    }

    return (
        <div className="border rounded overflow-auto max-h-[calc(100vh-250px)]">
            <ul>
                {filteredIssues.map((issue: any) => (
                    <li
                        key={issue._id}
                        onClick={() => onIssueClick(issue)}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition-colors ${selectedIssueId === issue._id ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                    >
                        <div className="flex items-start space-x-2">
                            <Badge className={severityClass(issue.severity)}>
                                {cap(issue.severity)}
                            </Badge>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600 mb-1">{issue.section}</p>
                                <p className="text-sm line-clamp-3 break-words">{issue.originalText}</p>
                                {issue.offsetStart && (
                                    <p className="text-xs text-gray-400 mt-1">Offset: {issue.offsetStart}</p>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
} 