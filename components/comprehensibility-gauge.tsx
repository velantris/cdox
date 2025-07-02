"use client"
import { Badge } from "@/components/ui/badge"

interface ComprehensibilityGaugeProps {
  score: number
}

export function ComprehensibilityGauge({ score }: ComprehensibilityGaugeProps) {
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", color: "bg-green-500" }
    if (score >= 80) return { grade: "A", color: "bg-green-500" }
    if (score >= 70) return { grade: "B", color: "bg-blue-500" }
    if (score >= 60) return { grade: "C", color: "bg-yellow-500" }
    if (score >= 50) return { grade: "D", color: "bg-orange-500" }
    return { grade: "F", color: "bg-red-500" }
  }

  const { grade, color } = getGrade(score)

  return (
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-32 h-32 mx-auto relative">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 314} 314`}
              className={
                score >= 80
                  ? "text-green-500"
                  : score >= 60
                    ? "text-blue-500"
                    : score >= 40
                      ? "text-yellow-500"
                      : "text-red-500"
              }
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center space-x-2">
        <Badge className={`${color} text-white`}>Grade {grade}</Badge>
      </div>
      <p className="text-sm text-gray-600">
        {score >= 80
          ? "Excellent comprehensibility"
          : score >= 60
            ? "Good, with room for improvement"
            : "Needs significant improvement"}
      </p>
    </div>
  )
}
