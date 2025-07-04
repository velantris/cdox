"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Edit, FileText, Plus, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const customRules = [
  {
    id: "rule-001",
    name: "Sole Discretion Ambiguity",
    pattern: "at (its|their) sole discretion",
    type: "regex",
    label: "Ambiguity",
    severity: "High",
    description: "Flags vague discretionary language that may confuse customers",
    active: true,
    created: "2024-12-15",
    lastModified: "2025-01-02",
  },
  {
    id: "rule-002",
    name: "Legal Jargon - Hereinafter",
    pattern: "hereinafter",
    type: "keyword",
    label: "Legal Jargon",
    severity: "Medium",
    description: "Identifies outdated legal terminology",
    active: true,
    created: "2024-12-10",
    lastModified: "2024-12-10",
  },
  {
    id: "rule-003",
    name: "Complex Liability Language",
    pattern: "(consequential|incidental|punitive) damages?",
    type: "regex",
    label: "Legal Jargon",
    severity: "Critical",
    description: "Detects complex liability terms that need simplification",
    active: true,
    created: "2024-12-08",
    lastModified: "2024-12-20",
  },
  {
    id: "rule-004",
    name: "Passive Voice Overuse",
    pattern: "shall be (held|considered|deemed)",
    type: "regex",
    label: "Readability",
    severity: "Low",
    description: "Identifies passive voice constructions that could be simplified",
    active: false,
    created: "2024-11-25",
    lastModified: "2024-11-25",
  },
]

export default function SettingsPage() {
  const [rules, setRules] = useState(customRules)
  const [newRule, setNewRule] = useState({
    name: "",
    pattern: "",
    type: "keyword",
    label: "Custom",
    severity: "Medium",
    description: "",
  })
  const [showAddRule, setShowAddRule] = useState(false)

  const handleAddRule = () => {
    if (newRule.name && newRule.pattern) {
      const rule = {
        id: `rule-${Date.now()}`,
        ...newRule,
        active: true,
        created: new Date().toISOString().split("T")[0],
        lastModified: new Date().toISOString().split("T")[0],
      }
      setRules([...rules, rule])
      setNewRule({
        name: "",
        pattern: "",
        type: "keyword",
        label: "Custom",
        severity: "Medium",
        description: "",
      })
      setShowAddRule(false)
    }
  }

  const toggleRule = (id: string) => {
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule)))
  }

  const deleteRule = (id: string) => {
    setRules(rules.filter((rule) => rule.id !== id))
  }

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
                <Link href="/dashboard/documents" className="text-gray-600 hover:text-gray-900">
                  Documents
                </Link>
                <Link href="/dashboard/teams" className="text-gray-600 hover:text-gray-900">
                  Teams
                </Link>
                <Link href="/dashboard/settings" className="text-blue-600 font-medium">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Configure analysis rules and system preferences</p>
        </div>

        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rules">Custom Rules</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            {/* Rules Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Custom Analysis Rules</h2>
                <p className="text-gray-600">Define organization-specific patterns and requirements</p>
              </div>
              <Button onClick={() => setShowAddRule(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {/* Add New Rule Form */}
            {showAddRule && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Rule</CardTitle>
                  <CardDescription>Create a custom rule to flag specific patterns in documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rule-name">Rule Name</Label>
                      <Input
                        id="rule-name"
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        placeholder="e.g., Avoid Complex Terms"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rule-type">Pattern Type</Label>
                      <Select value={newRule.type} onValueChange={(value) => setNewRule({ ...newRule, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keyword">Keyword</SelectItem>
                          <SelectItem value="regex">Regular Expression</SelectItem>
                          <SelectItem value="phrase">Exact Phrase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-pattern">Pattern</Label>
                    <Input
                      id="rule-pattern"
                      value={newRule.pattern}
                      onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                      placeholder={newRule.type === "regex" ? "e.g., (shall|must) be" : "e.g., notwithstanding"}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rule-label">Issue Label</Label>
                      <Select value={newRule.label} onValueChange={(value) => setNewRule({ ...newRule, label: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Legal Jargon">Legal Jargon</SelectItem>
                          <SelectItem value="Ambiguity">Ambiguity</SelectItem>
                          <SelectItem value="Readability">Readability</SelectItem>
                          <SelectItem value="Compliance">Compliance</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rule-severity">Severity</Label>
                      <Select
                        value={newRule.severity}
                        onValueChange={(value) => setNewRule({ ...newRule, severity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Critical">Critical</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-description">Description</Label>
                    <Textarea
                      id="rule-description"
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      placeholder="Describe what this rule checks for and why it's important"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button onClick={handleAddRule}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Rule
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddRule(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rules List */}
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-lg">{rule.name}</h3>
                          <Badge
                            variant={
                              rule.severity === "Critical"
                                ? "destructive"
                                : rule.severity === "High"
                                  ? "destructive"
                                  : rule.severity === "Medium"
                                    ? "secondary"
                                    : "default"
                            }
                          >
                            {rule.severity}
                          </Badge>
                          <Badge variant="outline">{rule.label}</Badge>
                          <Badge variant={rule.type === "regex" ? "secondary" : "outline"}>{rule.type}</Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{rule.description}</p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <code className="text-sm font-mono">{rule.pattern}</code>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created: {rule.created}</span>
                          <span>•</span>
                          <span>Modified: {rule.lastModified}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                          <span className="text-sm">{rule.active ? "Active" : "Inactive"}</span>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Settings</CardTitle>
                <CardDescription>Configure regulatory compliance checks and standards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">GDPR Compliance</h4>
                      <p className="text-sm text-gray-600">Check privacy policies for GDPR requirements</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">MiFID II Requirements</h4>
                      <p className="text-sm text-gray-600">Validate investment service disclosures</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">PSD2 Transparency</h4>
                      <p className="text-sm text-gray-600">Ensure payment service clarity standards</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Plain Language Guidelines</h4>
                      <p className="text-sm text-gray-600">Apply EU Commission plain language standards</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how and when you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive email alerts for document analysis completion</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Critical Issue Alerts</h4>
                      <p className="text-sm text-gray-600">Immediate notifications for critical compliance issues</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Weekly Summary</h4>
                      <p className="text-sm text-gray-600">Weekly digest of team activity and progress</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Slack Integration</h4>
                      <p className="text-sm text-gray-600">Send notifications to Slack channels</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>System preferences and default configurations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-jurisdiction">Default Jurisdiction</Label>
                    <Select defaultValue="eu">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eu">European Union</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="es">Spain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score-threshold">Minimum Acceptable Score</Label>
                  <Input id="score-threshold" type="number" defaultValue="70" min="0" max="100" />
                  <p className="text-sm text-gray-600">Documents below this score will be flagged for review</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-assign Documents</h4>
                    <p className="text-sm text-gray-600">Automatically assign documents to teams based on type</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Version Control</h4>
                    <p className="text-sm text-gray-600">Track document versions and changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
