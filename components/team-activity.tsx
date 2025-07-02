import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const activities = [
  {
    id: 1,
    user: "Sarah Chen",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "reviewed",
    document: "Terms & Conditions v4.2",
    time: "2 hours ago",
    type: "review",
  },
  {
    id: 2,
    user: "Marcus Weber",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "approved",
    document: "Privacy Policy GDPR",
    time: "1 day ago",
    type: "approval",
  },
  {
    id: 3,
    user: "Elena Rodriguez",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "flagged 5 issues in",
    document: "Loan Agreement Template",
    time: "2 days ago",
    type: "issue",
  },
  {
    id: 4,
    user: "James Thompson",
    avatar: "/placeholder.svg?height=32&width=32",
    action: "uploaded",
    document: "Fee Schedule 2025",
    time: "3 days ago",
    type: "upload",
  },
]

export function TeamActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={activity.avatar || "/placeholder.svg"} alt={activity.user} />
            <AvatarFallback>
              {activity.user
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{activity.user}</span> {activity.action}{" "}
              <span className="font-medium">{activity.document}</span>
            </p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
          <Badge
            variant={
              activity.type === "approval"
                ? "default"
                : activity.type === "review"
                  ? "secondary"
                  : activity.type === "issue"
                    ? "destructive"
                    : "outline"
            }
            className="text-xs"
          >
            {activity.type}
          </Badge>
        </div>
      ))}
    </div>
  )
}
