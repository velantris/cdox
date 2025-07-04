"use client"

import type React from "react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, ArrowLeft, CheckCircle, FileText, Loader2, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function UploadPage() {
  const [uploadStep, setUploadStep] = useState<"upload" | "processing" | "complete">("upload")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const router = useRouter()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadStep("processing")

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i)
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    setUploadStep("complete")

    // Redirect to analysis page after 2 seconds
    setTimeout(() => {
      router.push("/dashboard/documents/doc-new")
    }, 2000)
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
                <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">
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
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Document</h1>
          <p className="text-gray-600">Upload a legal document for comprehensibility analysis</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {uploadStep === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>Upload your legal document and configure analysis settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="file">Document File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Drop your file here, or click to browse</p>
                      <p className="text-sm text-gray-500">Supports PDF, DOC, DOCX files up to 10MB</p>
                    </div>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      className="mt-4 bg-transparent"
                      onClick={() => document.getElementById("file")?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Selected: {selectedFile.name}</span>
                    </div>
                  )}
                </div>

                {/* Document Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input id="title" placeholder="e.g., Terms & Conditions v5.0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="terms">Terms & Conditions</SelectItem>
                        <SelectItem value="privacy">Privacy Policy</SelectItem>
                        <SelectItem value="loan">Loan Agreement</SelectItem>
                        <SelectItem value="fee">Fee Schedule</SelectItem>
                        <SelectItem value="disclosure">Regulatory Disclosure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail Customers</SelectItem>
                        <SelectItem value="business">Business Customers</SelectItem>
                        <SelectItem value="institutional">Institutional Clients</SelectItem>
                        <SelectItem value="general">General Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select jurisdiction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eu">European Union</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="es">Spain</SelectItem>
                        <SelectItem value="nl">Netherlands</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Assign to Team</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legal">Legal Team</SelectItem>
                      <SelectItem value="compliance">Compliance Team</SelectItem>
                      <SelectItem value="product">Product Team</SelectItem>
                      <SelectItem value="operations">Operations Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version Tag</Label>
                  <Input id="version" placeholder="e.g., v5.0, 2025-Q1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific requirements or context for this analysis..."
                    rows={3}
                  />
                </div>

                {/* Analysis Options */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Analysis Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="gdpr" defaultChecked />
                      <Label htmlFor="gdpr" className="text-sm">
                        GDPR Compliance Check
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mifid" defaultChecked />
                      <Label htmlFor="mifid" className="text-sm">
                        MiFID II Requirements
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="psd2" />
                      <Label htmlFor="psd2" className="text-sm">
                        PSD2 Transparency Standards
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="custom-rules" defaultChecked />
                      <Label htmlFor="custom-rules" className="text-sm">
                        Apply Custom Organization Rules
                      </Label>
                    </div>
                  </div>
                </div>

                <Button onClick={handleUpload} disabled={!selectedFile} className="w-full" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {uploadStep === "processing" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Document
                </CardTitle>
                <CardDescription>Analyzing document comprehensibility and generating insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Document uploaded successfully</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Text extraction completed</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-sm">Running comprehensibility analysis...</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-500">Generating improvement suggestions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-500">Creating section heatmap</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Analysis in Progress</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        This may take a few minutes depending on document length and complexity.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadStep === "complete" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Analysis Complete
                </CardTitle>
                <CardDescription>Your document has been successfully analyzed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Document Analysis Ready</h3>
                    <p className="text-gray-600">
                      Comprehensibility score: <span className="font-bold">72/100</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">15</div>
                    <div className="text-sm text-gray-600">Issues Found</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">6</div>
                    <div className="text-sm text-gray-600">Sections Analyzed</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => router.push("/dashboard/documents/doc-new")}>
                    View Analysis Results
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/dashboard")}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
