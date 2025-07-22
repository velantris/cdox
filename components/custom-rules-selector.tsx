"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface CustomRulesSelectorProps {
    selectedRules: Id<"customRules">[]
    onSelectionChange: (selectedRules: Id<"customRules">[]) => void
}

export function CustomRulesSelector({ selectedRules, onSelectionChange }: CustomRulesSelectorProps) {
    const allRules = useQuery(api.customRules.getAllCustomRules) || []
    const [selected, setSelected] = useState<Id<"customRules">[]>(selectedRules)

    useEffect(() => {
        setSelected(selectedRules)
    }, [selectedRules])

    const handleToggleRule = (ruleId: Id<"customRules">) => {
        const newSelected = selected.includes(ruleId)
            ? selected.filter(id => id !== ruleId)
            : [...selected, ruleId]

        setSelected(newSelected)
        onSelectionChange(newSelected)
    }

    const handleSelectAll = () => {
        const allRuleIds = allRules.map(rule => rule._id)
        setSelected(allRuleIds)
        onSelectionChange(allRuleIds)
    }

    const handleClearAll = () => {
        setSelected([])
        onSelectionChange([])
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "Critical":
                return <AlertTriangle className="w-4 h-4 text-red-500" />
            case "High":
                return <AlertCircle className="w-4 h-4 text-orange-500" />
            case "Medium":
                return <Info className="w-4 h-4 text-yellow-500" />
            case "Low":
                return <CheckCircle className="w-4 h-4 text-green-500" />
            default:
                return <Info className="w-4 h-4 text-blue-500" />
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "Critical":
                return "bg-red-100 text-red-800"
            case "High":
                return "bg-orange-100 text-orange-800"
            case "Medium":
                return "bg-yellow-100 text-yellow-800"
            case "Low":
                return "bg-green-100 text-green-800"
            default:
                return "bg-blue-100 text-blue-800"
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle>Custom Rules</CardTitle>
                    <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                            Select All
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleClearAll}>
                            Clear
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {allRules.length === 0 ? (
                    <p className="text-sm text-gray-500">No custom rules available.</p>
                ) : (
                    <div className="space-y-4">
                        {allRules.map((rule) => (
                            <div key={rule._id} className="flex items-start space-x-3">
                                <Checkbox
                                    id={`rule-${rule._id}`}
                                    checked={selected.includes(rule._id)}
                                    onCheckedChange={() => handleToggleRule(rule._id)}
                                />
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor={`rule-${rule._id}`}
                                        className="font-medium cursor-pointer flex items-center gap-2"
                                    >
                                        {rule.name}
                                        <Badge className={`ml-2 ${getSeverityColor(rule.severity)}`}>
                                            <span className="flex items-center gap-1">
                                                {getSeverityIcon(rule.severity)}
                                                {rule.severity}
                                            </span>
                                        </Badge>
                                        <Badge variant="outline">{rule.type}</Badge>
                                        {!rule.active && <Badge variant="outline" className="bg-gray-100">Inactive</Badge>}
                                    </Label>
                                    <p className="text-sm text-gray-500">{rule.description}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-1">Pattern: {rule.pattern}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}