"use client"

import { Badge } from "@/components/ui/badge"
import { Eye, MapPin, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// Enhanced CSS for issues list animations and visual effects
const issuesListStyles = `
  @keyframes issueSelect {
    0% {
      transform: scale(1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    }
  }
  
  @keyframes pulseGlow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .issue-select-animation {
    animation: issueSelect 0.3s ease-out;
  }
  
  .issue-pulse {
    animation: pulseGlow 2s infinite;
  }
  
  .viewing-indicator {
    animation: slideInRight 0.3s ease-out;
  }
  
  .severity-glow-critical {
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2), 0 4px 12px rgba(220, 38, 38, 0.15);
  }
  
  .severity-glow-high {
    box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2), 0 4px 10px rgba(234, 88, 12, 0.15);
  }
  
  .severity-glow-medium {
    box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2), 0 4px 10px rgba(217, 119, 6, 0.15);
  }
  
  .severity-glow-low {
    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2), 0 4px 10px rgba(22, 163, 74, 0.15);
  }
`

// Inject styles into document head
if (typeof document !== 'undefined' && !document.querySelector('#issues-list-styles')) {
    const styleElement = document.createElement('style')
    styleElement.id = 'issues-list-styles'
    styleElement.textContent = issuesListStyles
    document.head.appendChild(styleElement)
}

interface IssuesListProps {
    issues: any[]
    selectedIssueId: string | null
    onIssueClick: (issue: any) => void
    severityFilter: string
}

export function IssuesList({ issues, selectedIssueId, onIssueClick, severityFilter }: IssuesListProps) {
    // Enhanced severity color mapping with consistent styling
    const severityClass = (severity: string) => {
        const sev = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()
        switch (sev) {
            case "Critical":
                return "bg-red-500 text-white shadow-red-200 border-red-600"
            case "High":
                return "bg-orange-500 text-white shadow-orange-200 border-orange-600"
            case "Medium":
                return "bg-yellow-500 text-black shadow-yellow-200 border-yellow-600"
            case "Low":
            default:
                return "bg-green-500 text-white shadow-green-200 border-green-600"
        }
    }

    // Get severity glow class for enhanced visual feedback
    const getSeverityGlow = (severity: string) => {
        const sev = severity.toLowerCase()
        return `severity-glow-${sev}`
    }

    // Get severity icon for better visual hierarchy
    const getSeverityIcon = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'critical': return '⚠️'
            case 'high': return '🔶'
            case 'medium': return '⚡'
            case 'low': return '✅'
            default: return '📍'
        }
    }

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    const filteredIssues = issues.filter((issue: any) =>
        severityFilter === "All" ||
        issue.severity.toLowerCase() === severityFilter.toLowerCase()
    )

    if (filteredIssues.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-1">No Issues Found</h3>
                        <p className="text-sm">
                            {severityFilter === "All"
                                ? "This document has no identified issues."
                                : `No ${severityFilter.toLowerCase()} severity issues found.`}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px]">
            {/* Enhanced header with gradient background */}
            <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <span>Issues ({filteredIssues.length})</span>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Click to locate</span>
                    </div>
                </div>
            </div>

            {/* Enhanced scrollable list with smooth scrolling */}
            <div className="overflow-auto h-full smooth-scroll">
                <ul className="divide-y divide-gray-100">
                    {filteredIssues.map((issue: any, index: number) => (
                        <li
                            key={issue._id}
                            onClick={() => onIssueClick(issue)}
                            className={cn(
                                "p-4 cursor-pointer transition-all duration-300 ease-out relative group",
                                "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50",
                                "hover:shadow-md hover:-translate-y-0.5",
                                "active:translate-y-0 active:shadow-sm active:duration-75",
                                selectedIssueId === issue._id && [
                                    'bg-gradient-to-r from-blue-50 to-indigo-50',
                                    'border-l-4 border-l-blue-500',
                                    'shadow-lg',
                                    getSeverityGlow(issue.severity),
                                    'issue-select-animation',
                                    'issue-pulse'
                                ]
                            )}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            <div className="flex items-start space-x-3">
                                {/* Enhanced severity badge with icon */}
                                <div className="flex-shrink-0">
                                    <Badge
                                        className={cn(
                                            severityClass(issue.severity),
                                            "text-xs px-3 py-1.5 font-medium shadow-sm border",
                                            "transition-all duration-200",
                                            "group-hover:shadow-md group-hover:scale-105"
                                        )}
                                    >
                                        <span className="mr-1">{getSeverityIcon(issue.severity)}</span>
                                        {cap(issue.severity)}
                                    </Badge>
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                    {/* Enhanced header with better spacing */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <p className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full truncate">
                                                {issue.section || 'General'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {issue.type || 'Issue'}
                                            </p>
                                        </div>

                                        {/* Enhanced viewing indicator */}
                                        {selectedIssueId === issue._id && (
                                            <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded-full viewing-indicator">
                                                <Eye className="w-3 h-3 mr-1" />
                                                <span className="text-xs font-semibold">Viewing</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Enhanced issue text with better typography */}
                                    <p className="text-sm text-gray-800 line-clamp-3 break-words leading-relaxed font-medium">
                                        {issue.originalText}
                                    </p>

                                    {/* Enhanced metadata with icons */}
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex items-center space-x-3">
                                            {issue.offsetStart !== undefined && (
                                                <div className="flex items-center space-x-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>Position: {issue.offsetStart}</span>
                                                </div>
                                            )}
                                            {issue.suggestedRewrite && (
                                                <div className="flex items-center space-x-1 text-green-600">
                                                    <span>✨</span>
                                                    <span>Has suggestion</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status indicator */}
                                        {issue.status && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs px-2 py-0.5 bg-white"
                                            >
                                                {cap(issue.status)}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
} 