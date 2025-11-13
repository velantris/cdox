'use client';

import { DashboardHeader } from "@/components/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring-service";
import { AlertCircle, ArrowLeft, CheckCircle, Clock, Loader2, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface AnalysisStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  progress?: number;
}

export default function UploadPage() {
  const [uploadStep, setUploadStep] = useState<"upload" | "processing" | "analyzing" | "complete">("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [audience, setAudience] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [team, setTeam] = useState("");
  const [versionTag, setVersionTag] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState("");
  const [compliance, setCompliance] = useState<string[]>(["GDPR", "MiFID"]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<Id<"scans"> | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stepSimState, setStepSimState] = useState<{
    running: boolean;
    paused: boolean;
    currentStep: number;
    stepProgress: number;
  } | null>(null);
  const backendDoneRef = useRef<null | "completed" | "failed">(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [selectedScoringConfigId, setSelectedScoringConfigId] = useState<string | null>(null);

  // Convex actions
  const uploadDocument = useAction(api.upload.uploadDocument);
  const performAnalysis = useAction(api.analysis_action.performDocumentAnalysis);
  const scoringConfigsQuery = useQuery(api.scoringConfigs.getScoringConfigs, {})
  const scoringConfigs = useMemo(() => scoringConfigsQuery ?? [], [scoringConfigsQuery]);
  const defaultScoringConfig = scoringConfigs.find((config) => config.isDefault);

  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: "extraction", label: "Extracting text content", status: "pending" },
    { id: "parsing", label: "Parsing document structure", status: "pending" },
    { id: "readability", label: "Analyzing readability metrics", status: "pending" },
    { id: "compliance", label: "Checking regulatory compliance", status: "pending" },
    { id: "scoring", label: "Calculating comprehensibility score", status: "pending" },
    { id: "suggestions", label: "Generating improvement suggestions", status: "pending" },
  ]);

  const analysisQuery = useQuery(
    api.analysis.getAnalysisByScan,
    currentScanId && uploadStep === "analyzing"
      ? { scanId: currentScanId }
      : "skip"
  );

  useEffect(() => {
    if (scoringConfigs.length === 0) return;
    if (!defaultScoringConfig && selectedScoringConfigId === null) {
      const firstConfigId = scoringConfigs[0]?._id;
      if (firstConfigId) {
        setSelectedScoringConfigId(String(firstConfigId));
      }
    }
  }, [scoringConfigs, defaultScoringConfig, selectedScoringConfigId]);

  const selectedScoringConfigLabel =
    selectedScoringConfigId
      ? scoringConfigs.find((config) => String(config._id) === selectedScoringConfigId)?.name ?? "Custom configuration"
      : defaultScoringConfig?.name ?? DEFAULT_SCORING_CONFIG.name;

  // Simulate step progress, pausing at last step
  useEffect(() => {
    if (uploadStep !== "analyzing") return;
    if (stepSimState?.running) return;
    setStepSimState({ running: true, paused: false, currentStep: 0, stepProgress: 0 });
    let currentStepIndex = 0;
    const stepDurations = [2000, 2000, 2000, 2000, 2000, 2000];
    let paused = false;
    function runStep() {
      if (paused) return;
      if (currentStepIndex >= analysisSteps.length - 1) {
        // Pause at last step (simulate random number between 82 to 97 %) on suggestions step
        const pauseProgress = Math.floor(Math.random() * (97 - 82 + 1)) + 82;
        // Mark prior steps completed and set suggestions as running with randomized progress
        setAnalysisSteps(prev =>
          prev.map((step, idx) => {
            if (idx < currentStepIndex) return { ...step, status: "completed", progress: 100 };
            if (idx === currentStepIndex) return { ...step, status: "running", progress: pauseProgress };
            return { ...step, status: "pending", progress: 0 };
          })
        );
        setStepSimState(s => s && { ...s, paused: true, currentStep: currentStepIndex, stepProgress: pauseProgress });
        setAnalysisProgress(pauseProgress);
        return;
      }
      setAnalysisSteps(prev => prev.map((step, idx) => {
        if (idx < currentStepIndex) return { ...step, status: "completed", progress: 100 };
        if (idx === currentStepIndex) return { ...step, status: "running", progress: 0 };
        return { ...step, status: "pending", progress: 0 };
      }));
      let stepProgress = 0;
      const interval = setInterval(() => {
        if (paused) { clearInterval(interval); return; }
        stepProgress += 100 / (stepDurations[currentStepIndex] / 100);
        setAnalysisSteps(prev => prev.map((step, idx) =>
          idx === currentStepIndex ? { ...step, status: "running", progress: Math.min(stepProgress, 100) } : step
        ));
        // Update overall progress
        const completed = currentStepIndex;
        const overall = ((completed + stepProgress / 100) / analysisSteps.length) * 100;

        setAnalysisProgress(Math.min(overall, 95));
        if (stepProgress >= 100) {
          clearInterval(interval);
          setAnalysisSteps(prev => prev.map((step, idx) =>
            idx === currentStepIndex ? { ...step, status: "completed", progress: 100 } : step
          ));
          currentStepIndex++;
          setStepSimState(s => s && { ...s, currentStep: currentStepIndex, stepProgress: 0 });
          setTimeout(runStep, 200);
        }
      }, 100);
    }
    setTimeout(runStep, 200);
    return () => { paused = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadStep]);

  // Watch backend status
  useEffect(() => {
    if (uploadStep !== "analyzing" || !analysisQuery || !Array.isArray(analysisQuery) || analysisQuery.length === 0) return;
    const analysis = analysisQuery[0];
    if (analysis.status === "completed") {
      backendDoneRef.current = "completed";
      // Finish last step, set progress to 100, then show complete
      setAnalysisSteps(prev => prev.map((step, idx) =>
        idx < prev.length - 1 ? { ...step, status: "completed", progress: 100 } :
          idx === prev.length - 1 ? { ...step, status: "completed", progress: 100 } : step
      ));
      setAnalysisProgress(100);
      setTimeout(() => setUploadStep("complete"), 500);
    } else if (analysis.status === "failed") {
      backendDoneRef.current = "failed";
      setAnalysisError(analysis.summary || "Analysis failed");
      setUploadStep("upload");
    }
  }, [analysisQuery, uploadStep]);

  // Cleanup polling on unmount
  useEffect(() => {
    const pollInterval = pollIntervalRef.current;
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  const simulateAnalysisProgress = () => {
    let currentStepIndex = 0;
    // Rough duration (ms) each analysis step should take – tweak these to adjust total analysis time
    const stepDurations = [6000, 8000, 10000, 9000, 8000, 7000];

    const processStep = () => {
      if (currentStepIndex >= analysisSteps.length) return;

      const currentStep = analysisSteps[currentStepIndex];

      // Mark current step as running
      setAnalysisSteps(prev => prev.map((step, index) => {
        if (index < currentStepIndex) return { ...step, status: "completed" };
        if (index === currentStepIndex) return { ...step, status: "running" };
        return step;
      }));

      // Simulate progress within the step
      let stepProgress = 0;
      const intervalMs = 200; // update frequency
      const increment = 100 / (stepDurations[currentStepIndex] / intervalMs);
      const stepInterval = setInterval(() => {
        stepProgress += increment;
        if (stepProgress >= 100) {
          stepProgress = 100;
          clearInterval(stepInterval);

          // Mark step as completed
          setAnalysisSteps(prev => prev.map((step, index) =>
            index === currentStepIndex ? { ...step, status: "completed", progress: 100 } : step
          ));

          currentStepIndex++;

          if (currentStepIndex < analysisSteps.length) {
            setTimeout(processStep, 500); // Small delay between steps
          } else {
            // All steps completed
            setAnalysisProgress(100);
            setTimeout(() => {
              setUploadStep("complete");
            }, 1000);
          }
        } else {
          setAnalysisSteps(prev => prev.map((step, index) =>
            index === currentStepIndex ? { ...step, progress: stepProgress } : step
          ));
        }

        // Update overall progress
        const completedSteps = currentStepIndex;
        const currentStepProg = stepProgress / 100;
        const overall = ((completedSteps + currentStepProg) / analysisSteps.length) * 100;
        setAnalysisProgress(overall);
      }, intervalMs);
    };

    processStep();
  };

  const validateFields = () => {
    const errors: { [key: string]: string } = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!docType) errors.docType = "Type is required";
    if (!audience) errors.audience = "Audience is required";
    if (!jurisdiction) errors.jurisdiction = "Jurisdiction is required";
    if (!language) errors.language = "Language is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleComplianceToggle =
    (flag: string) => (checked: boolean | "indeterminate") => {
      setCompliance((prev) => {
        if (checked === true) {
          return prev.includes(flag) ? prev : [...prev, flag];
        }
        return prev.filter((item) => item !== flag);
      });
    };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Check file type
      if (file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type.startsWith('text/') ||
        file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a DOC, DOCX, PDF, or text file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!validateFields()) return;

    setUploadStep("processing");
    setAnalysisError(null);

    try {
      setUploadProgress(20);
      // Convert file to bytes for Convex
      const fileBuffer = await selectedFile.arrayBuffer();
      setUploadProgress(40);
      // Upload document using Convex action
      const result = await uploadDocument({
        filename: selectedFile.name,
        fileData: fileBuffer,
        contentType: selectedFile.type,
        scanMetadata: {
          name: title || selectedFile.name,
          language: language || "english",
          documentType: docType || "other",
          targetAudience: audience || "general",
          jurisdiction: jurisdiction || "eu",
          regulations: compliance.join(", ") || "GDPR",
        },
      });
      setCurrentScanId(result.scanId as Id<"scans">);
      setUploadProgress(100);
      setTimeout(async () => {
        setUploadStep("analyzing");
        try {
          await performAnalysis({
            scanId: result.scanId,
            scoringConfigId: selectedScoringConfigId
              ? (selectedScoringConfigId as Id<"scoringConfigs">)
              : undefined,
          });
        } catch (err) {
          setAnalysisError("Failed to start analysis: " + (err instanceof Error ? err.message : "Unknown error"));
          setUploadStep("upload");
          return;
        }
        // No manual polling needed; useQuery will update reactively
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStep("upload");
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      setAnalysisError(message);
    }
  };

  const getStepIcon = (step: AnalysisStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <div className="p-6">
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
                <div className="space-y-2">
                  <Label htmlFor="file">Document File</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Drop your file here, or click to browse</p>
                      <p className="text-sm text-gray-500">Supports DOC, DOCX, PDF, and text files up to 10MB</p>
                    </div>
                    <Input
                      id="file"
                      type="file"
                      accept=".doc,.docx,.txt,.pdf"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Terms & Conditions v5.0"
                    />
                    {validationErrors.title && <div className="text-xs text-red-600">{validationErrors.title}</div>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type <span className="text-red-500">*</span></Label>
                    <Select value={docType} onValueChange={(val) => setDocType(val)}>
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
                    {validationErrors.docType && <div className="text-xs text-red-600">{validationErrors.docType}</div>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience <span className="text-red-500">*</span></Label>
                    <Select value={audience} onValueChange={(val) => setAudience(val)}>
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
                    {validationErrors.audience && <div className="text-xs text-red-600">{validationErrors.audience}</div>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction <span className="text-red-500">*</span></Label>
                    <Select value={jurisdiction} onValueChange={(val) => setJurisdiction(val)}>
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
                    {validationErrors.jurisdiction && <div className="text-xs text-red-600">{validationErrors.jurisdiction}</div>}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language <span className="text-red-500">*</span></Label>
                    <Select value={language} onValueChange={(val) => setLanguage(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="italian">Italian</SelectItem>
                        <SelectItem value="french">French</SelectItem>
                        <SelectItem value="hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.language && <div className="text-xs text-red-600">{validationErrors.language}</div>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Assign to Team</Label>
                  <Select value={team} onValueChange={(val) => setTeam(val)}>
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
                  <Input
                    id="version"
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    placeholder="e.g., v5.0, 2025-Q1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific requirements or context for this analysis..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scoring-config">Scoring Configuration</Label>
                  <Select
                    value={selectedScoringConfigId ?? "default"}
                    onValueChange={(value) => setSelectedScoringConfigId(value === "default" ? null : value)}
                    disabled={scoringConfigs.length === 0}
                  >
                    <SelectTrigger id="scoring-config">
                      <SelectValue placeholder="Choose configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Use Default ({defaultScoringConfig?.name ?? DEFAULT_SCORING_CONFIG.name})
                      </SelectItem>
                      {scoringConfigs
                        .filter((config) => !config.isDefault)
                        .map((config) => (
                          <SelectItem key={String(config._id)} value={String(config._id)}>
                            {config.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {scoringConfigs.length === 0
                      ? "No saved scoring profiles yet. The platform default weights will be used."
                      : `Current selection: ${selectedScoringConfigLabel}`}
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Analysis Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gdpr"
                        checked={compliance.includes("GDPR")}
                        onCheckedChange={handleComplianceToggle("GDPR")}
                      />
                      <Label htmlFor="gdpr" className="text-sm">
                        GDPR Compliance Check
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mifid"
                        checked={compliance.includes("MiFID")}
                        onCheckedChange={handleComplianceToggle("MiFID")}
                      />
                      <Label htmlFor="mifid" className="text-sm">
                        MiFID II Requirements
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="psd2"
                        checked={compliance.includes("PSD2")}
                        onCheckedChange={handleComplianceToggle("PSD2")}
                      />
                      <Label htmlFor="psd2" className="text-sm">
                        PSD2 Transparency Standards
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pdf-iso"
                        checked={compliance.includes("PDF ISO")}
                        onCheckedChange={handleComplianceToggle("PDF ISO")}
                      />
                      <Label htmlFor="pdf-iso" className="text-sm">
                        PDF ISO Standards (ISO 32000 / PDF/A)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cefr"
                        checked={compliance.includes("CEFR")}
                        onCheckedChange={handleComplianceToggle("CEFR")}
                      />
                      <Label htmlFor="cefr" className="text-sm">
                        CEFR Reading Level Benchmark
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="custom-rules"
                        checked={compliance.includes("Custom")}
                        onCheckedChange={handleComplianceToggle("Custom")}
                      />
                      <Label htmlFor="custom-rules" className="text-sm">
                        Apply Custom Organization Rules
                      </Label>
                    </div>
                  </div>
                </div>

                {analysisError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900">Error</h4>
                        <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={handleUpload} disabled={!selectedFile || !title.trim() || !docType || !audience || !jurisdiction || !language} className="w-full" size="lg">
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
                  Uploading Document
                </CardTitle>
                <CardDescription>Preparing your document for analysis</CardDescription>
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
                    {uploadProgress >= 20 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    )}
                    <span className="text-sm">Uploading file to secure storage</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {uploadProgress >= 60 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : uploadProgress >= 20 ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span className="text-sm">Creating document record</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {uploadProgress >= 100 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : uploadProgress >= 60 ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                    <span className="text-sm">Preparing for analysis</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {uploadStep === "analyzing" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-500" />
                  Analyzing Document
                </CardTitle>
                <CardDescription>Running comprehensive comprehensibility analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Analysis Progress</span>
                    <span>{Math.round(analysisProgress)}%</span>
                  </div>
                  <Progress value={analysisProgress} className="h-3" />
                </div>

                <div className="space-y-3">
                  {analysisSteps.map((step: AnalysisStep, index: number) => (
                    <div key={step.id} className="flex items-center space-x-3">
                      {getStepIcon(step)}
                      <div className="flex-1">
                        <span className={`text-sm ${step.status === "completed" ? "text-green-700" :
                          step.status === "running" ? "text-blue-700" :
                            step.status === "error" ? "text-red-700" :
                              "text-gray-500"
                          }`}>
                          {step.label}
                        </span>
                        {step.status === "running" && step.progress && (
                          <div className="mt-1">
                            <Progress value={step.progress} className="h-1" />
                          </div>
                        )}
                      </div>
                      {step.status === "completed" && (
                        <span className="text-xs text-green-600 font-medium">Done</span>
                      )}
                      {step.status === "running" && step.progress && (
                        <span className="text-xs text-blue-600 font-medium">
                          {Math.round(step.progress)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Zap className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">AI Analysis in Progress</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Our AI is examining your document for readability, compliance, and improvement opportunities.
                        This typically takes 2-5 minutes.
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Scoring profile: {selectedScoringConfigLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {analysisError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900">Analysis Error</h4>
                        <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                      </div>
                    </div>
                  </div>
                )}
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
                    <h3 className="text-lg font-medium">Analysis Complete!</h3>
                    <p className="text-gray-600">
                      Your document has been fully analyzed with comprehensive insights and recommendations.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-sm text-green-700 font-medium">Uploaded</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-sm text-green-700 font-medium">Analyzed</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-sm text-green-700 font-medium">Ready</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => router.push(`/dashboard/documents/${currentScanId || "doc-new"}`)}>
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
  );
}