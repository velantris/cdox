import { Progress } from "@/components/ui/progress"
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react"

const issuesSummary = [
  {
    type: "Critical",
    count: 23,
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-50",
    description: "Legal jargon, ambiguous clauses",
  },
  {
    type: "High",
    count: 45,
    icon: AlertCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    description: "Complex sentences, unclear terms",
  },
  {
    type: "Medium",
    count: 78,
    icon: Info,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    description: "Formatting, readability improvements",
  },
  {
    type: "Low",
    count: 34,
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50",
    description: "Minor suggestions, style improvements",
  },
]

export function IssuesSummary() {
  const totalIssues = issuesSummary.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-4">
      {issuesSummary.map((item) => {
        const Icon = item.icon
        const percentage = (item.count / totalIssues) * 100

        return (
          <div key={item.type} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <div className="font-medium">{item.type} Priority</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{item.count}</div>
                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
              </div>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        )
      })}
    </div>
  )
}
