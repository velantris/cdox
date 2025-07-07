import { DashboardHeader } from "@/components/dashboard-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Calendar, Mail, Phone, Users } from "lucide-react"

const teams = [
  {
    id: "legal-team",
    name: "Legal Team",
    description: "Primary legal review and document drafting",
    members: [
      {
        id: "sarah-chen",
        name: "Sarah Chen",
        role: "Senior Legal Counsel",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "sarah.chen@bank.eu",
        phone: "+49 30 1234 5678",
        activeDocuments: 8,
        completedTasks: 24,
        status: "active",
      },
      {
        id: "marcus-weber",
        name: "Marcus Weber",
        role: "Legal Associate",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "marcus.weber@bank.eu",
        phone: "+49 30 1234 5679",
        activeDocuments: 5,
        completedTasks: 18,
        status: "active",
      },
      {
        id: "anna-mueller",
        name: "Anna Müller",
        role: "Legal Intern",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "anna.mueller@bank.eu",
        phone: "+49 30 1234 5680",
        activeDocuments: 3,
        completedTasks: 12,
        status: "away",
      },
    ],
    stats: {
      totalDocuments: 16,
      completedThisMonth: 12,
      averageScore: 71,
      criticalIssues: 8,
    },
  },
  {
    id: "compliance-team",
    name: "Compliance Team",
    description: "Regulatory compliance and risk assessment",
    members: [
      {
        id: "elena-rodriguez",
        name: "Elena Rodriguez",
        role: "Compliance Manager",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "elena.rodriguez@bank.eu",
        phone: "+49 30 1234 5681",
        activeDocuments: 6,
        completedTasks: 31,
        status: "active",
      },
      {
        id: "james-thompson",
        name: "James Thompson",
        role: "Compliance Analyst",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "james.thompson@bank.eu",
        phone: "+49 30 1234 5682",
        activeDocuments: 4,
        completedTasks: 19,
        status: "active",
      },
    ],
    stats: {
      totalDocuments: 10,
      completedThisMonth: 8,
      averageScore: 78,
      criticalIssues: 3,
    },
  },
  {
    id: "product-team",
    name: "Product Team",
    description: "Product documentation and customer communications",
    members: [
      {
        id: "lisa-wang",
        name: "Lisa Wang",
        role: "Product Manager",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "lisa.wang@bank.eu",
        phone: "+49 30 1234 5683",
        activeDocuments: 7,
        completedTasks: 22,
        status: "active",
      },
      {
        id: "david-brown",
        name: "David Brown",
        role: "UX Writer",
        avatar: "/placeholder.svg?height=40&width=40",
        email: "david.brown@bank.eu",
        phone: "+49 30 1234 5684",
        activeDocuments: 9,
        completedTasks: 15,
        status: "active",
      },
    ],
    stats: {
      totalDocuments: 16,
      completedThisMonth: 14,
      averageScore: 82,
      criticalIssues: 2,
    },
  },
]

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teams</h1>
          <p className="text-gray-600">Manage team assignments and track progress across departments</p>
        </div>

        {/* Teams Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    {team.name}
                  </CardTitle>
                  <Badge variant="outline">{team.members.length} members</Badge>
                </div>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{team.stats.totalDocuments}</div>
                    <div className="text-xs text-gray-500">Total Docs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{team.stats.averageScore}</div>
                    <div className="text-xs text-gray-500">Avg Score</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed this month</span>
                    <span>
                      {team.stats.completedThisMonth}/{team.stats.totalDocuments}
                    </span>
                  </div>
                  <Progress value={(team.stats.completedThisMonth / team.stats.totalDocuments) * 100} className="h-2" />
                </div>
                {team.stats.criticalIssues > 0 && (
                  <div className="flex items-center space-x-2 mt-3 text-sm text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{team.stats.criticalIssues} critical issues</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Team View */}
        <div className="space-y-8">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name} - Team Members</CardTitle>
                <CardDescription>Individual performance and current assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${member.status === "active"
                                ? "bg-green-500"
                                : member.status === "away"
                                  ? "bg-yellow-500"
                                  : "bg-gray-500"
                              }`}
                          ></div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <p className="text-sm text-gray-500">{member.role}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{member.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{member.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-8">
                        <div className="text-center">
                          <div className="text-lg font-bold">{member.activeDocuments}</div>
                          <div className="text-xs text-gray-500">Active Docs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{member.completedTasks}</div>
                          <div className="text-xs text-gray-500">Completed</div>
                        </div>
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>
                          {member.status === "active" ? "Active" : "Away"}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Mail className="w-4 h-4 mr-2" />
                            Contact
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team Performance Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Team Performance Summary</CardTitle>
            <CardDescription>Overall metrics across all teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">42</div>
                <div className="text-sm text-gray-500">Total Documents</div>
                <div className="text-xs text-gray-400 mt-1">Across all teams</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">34</div>
                <div className="text-sm text-gray-500">Completed This Month</div>
                <div className="text-xs text-gray-400 mt-1">81% completion rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">77</div>
                <div className="text-sm text-gray-500">Average Score</div>
                <div className="text-xs text-gray-400 mt-1">+3 from last month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">13</div>
                <div className="text-sm text-gray-500">Critical Issues</div>
                <div className="text-xs text-gray-400 mt-1">Needs attention</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
