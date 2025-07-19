import { makePrompt } from "@/app/api/analyze/prompt-maker";
import { v4 as uuidv4 } from 'uuid';
import connectDB from "./db/client";
import { Analysis, Document as DocModel } from "./db/models";

// AI SDK imports
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Document parsing imports
import mammoth from "mammoth";

// Helper function to extract text from different document types
async function extractTextFromDocument(url: string): Promise<string> {
    // We support both remote (HTTP/S) URLs and local file paths that may exist on the server.
    // Fetch cannot read local files, so we attempt a filesystem read when the URL doesn't start with http/https.

    let buffer: ArrayBuffer;
    let contentType = "";

    if (url.startsWith("http://") || url.startsWith("https://")) {
        // Remote resource – use fetch as before
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
        }

        contentType = response.headers.get("content-type") || "";
        buffer = await response.arrayBuffer();
    } else {
        // Local file path – read from the filesystem
        const fs = await import("fs/promises");
        const path = await import("path");

        // Our local URLs are stored relative to the project root (e.g., /uploads/file.pdf)
        // We need to construct the full filesystem path from the web-style path.
        const relativePath = url.startsWith('/') ? url.substring(1) : url;
        const filePath = path.join(process.cwd(), relativePath);

        try {
            const nodeBuffer = await fs.readFile(filePath);
            buffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength) as ArrayBuffer;
        } catch (err) {
            throw new Error(`Failed to read local file: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Infer content-type from file extension when reading locally
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".pdf") contentType = "application/pdf";
        else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (ext === ".doc") contentType = "application/msword";
        else if (ext === ".txt") contentType = "text/plain";
    }

    // Determine file type and extract text accordingly
    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
        // Dynamically import pdf-parse to avoid server-side build issues
        const pdf = (await import('pdf-parse')).default;
        // Extract text from PDF
        const data = await pdf(Buffer.from(buffer));
        return data.text;
    }
    else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
        url.toLowerCase().endsWith('.docx')) {
        // Extract text from DOCX
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        return result.value;
    }
    else if (contentType.includes('application/msword') || url.toLowerCase().endsWith('.doc')) {
        // For .doc files, mammoth can handle some cases
        try {
            const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
            return result.value;
        } catch (error) {
            throw new Error('Legacy .doc format not fully supported. Please convert to .docx or PDF.');
        }
    }
    else if (contentType.includes('text/') || url.toLowerCase().endsWith('.txt')) {
        // Handle plain text files
        return new TextDecoder().decode(buffer);
    }
    else {
        // Fallback: try to decode as text
        try {
            return new TextDecoder().decode(buffer);
        } catch (error) {
            throw new Error(`Unsupported document format. Content-Type: ${contentType}`);
        }
    }
}

export interface AnalysisInput {
    doc_id?: string;
    document?: string;
    documentType?: string;
    targetAudience?: string;
    jurisdiction?: string;
    regulations?: string;
}

export interface AnalysisResult {
    summary: string;
    recommendations: string[];
    score: number;
    issues: any[];
    providerRaw: {
        openai: any;
        gemini: any;
    };
}

// Helper to safely parse JSON coming from models
export function safeJsonParse(jsonString: string) {
    try {
        // Remove markdown code block markers if present
        let cleanJson = jsonString;
        if (cleanJson.includes('```json')) {
            cleanJson = cleanJson.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        } else if (cleanJson.includes('```')) {
            cleanJson = cleanJson.replace(/```\s*/g, '');
        }

        return JSON.parse(cleanJson.trim());
    } catch {
        return null;
    }
}

// Prepare document data by fetching from DB if needed
export async function prepareDocumentData(input: AnalysisInput) {
    await connectDB();

    let document = input.document;
    let documentType = input.documentType;
    let targetAudience = input.targetAudience;
    let jurisdiction = input.jurisdiction;
    let regulations = input.regulations;

    // If docId is provided, fetch document metadata and, if missing, content
    if (input.doc_id) {
        const docRecord: any = await DocModel.findOne({ doc_id: input.doc_id }).lean();
        if (!docRecord) {
            throw new Error("Document not found");
        }

        // populate missing fields from record
        documentType = documentType || docRecord.options?.type || "";
        targetAudience = targetAudience || docRecord.options?.target_audience || "";
        jurisdiction = jurisdiction || docRecord.options?.jurisdiction || "";

        // Basic heuristic: get first compliance value as regs
        if (!regulations && Array.isArray(docRecord.options?.compliance)) {
            regulations = docRecord.options.compliance.join(', ')
        }

        // Fetch the raw document text if not provided directly
        if (!document) {
            try {
                document = await extractTextFromDocument(docRecord.url);
            } catch (error) {
                console.error(`Failed to extract text from document: ${error}`);
                // ignore fetch failures; will error later if document still undefined
            }
        }
    }

    if (!document) {
        throw new Error("No document content supplied or retrievable.");
    }

    // Provide sensible fallbacks so required DB fields are never empty strings
    documentType = (documentType ?? "").trim() || "general";
    targetAudience = (targetAudience ?? "").trim() || "general";
    jurisdiction = (jurisdiction ?? "").trim() || "unspecified";

    // Ensure remaining fields are strings (fallback to empty string for prompt)
    return {
        doc_id: input.doc_id,
        document,
        documentType,
        targetAudience,
        jurisdiction,
        regulations: regulations || "",
    };
}

// Run analysis using AI models
export async function runAnalysis(
    document: string,
    documentType: string,
    targetAudience: string,
    jurisdiction: string,
    regulations: string
): Promise<AnalysisResult> {
    // 1. Build prompt via prompt-maker
    const prompt = makePrompt(document, documentType, targetAudience, jurisdiction, regulations);

    // 2. Call both OpenAI and Gemini models in parallel
    const openaiModel = openai(process.env.OPENAI_MODEL || "gpt-4.1-nano");
    const geminiModel = google(process.env.GEMINI_MODEL || "gemini-2.5-flash");

    const [openaiRes, geminiRes] = await Promise.allSettled([
        generateText({ model: openaiModel, prompt }),
        generateText({ model: geminiModel, prompt }),
    ]);

    // 3. Extract text from results
    const openaiText = openaiRes.status === "fulfilled" ? openaiRes.value.text : null;
    const geminiText = geminiRes.status === "fulfilled" ? geminiRes.value.text : null;

    // 4. Parse JSON responses
    const openaiParsed = openaiText ? safeJsonParse(openaiText) : null;
    const geminiParsed = geminiText ? safeJsonParse(geminiText) : null;

    if (!openaiParsed && !geminiParsed) {
        throw new Error("Failed to parse analysis response from both models.");
    }

    // 5. Combine results intelligently
    const combinedIssues = [
        ...(openaiParsed?.issues || []),
        ...(geminiParsed?.issues || []),
    ].map((issue: any) => ({ ...issue, status: "Open" }));

    return {
        summary: openaiParsed?.summary || geminiParsed?.summary || "",
        recommendations: Array.from(new Set([
            ...(openaiParsed?.recommendations || []),
            ...(geminiParsed?.recommendations || []),
        ])),
        score: Math.round(
            ([openaiParsed?.score, geminiParsed?.score].filter((n) => typeof n === "number") as number[]).reduce((a, b) => a + b, 0) /
            ([openaiParsed?.score, geminiParsed?.score].filter((n) => typeof n === "number").length || 1)
        ),
        issues: combinedIssues,
        providerRaw: {
            openai: openaiParsed,
            gemini: geminiParsed,
        },
    };
}

// Save analysis results to database
export async function saveAnalysis(
    doc_id: string | undefined,
    documentType: string,
    targetAudience: string,
    jurisdiction: string,
    regulations: string,
    analysis: AnalysisResult
) {
    await connectDB();

    // Assign unique IDs to each issue for future status updates
    const issuesWithIds = (analysis.issues || []).map((issue: any) => ({ ...issue, id: uuidv4() }));
    const analysisToSave = { ...analysis, issues: issuesWithIds };

    const analysisData: any = {
        documentType,
        targetAudience,
        jurisdiction,
        regulations,
        analysis: analysisToSave,
    };

    if (doc_id) {
        analysisData.doc_id = doc_id;
    }

    console.log("Saving analysis data:", JSON.stringify(analysisData, null, 2));

    const analysisRecord = await Analysis.create(analysisData);

    return analysisRecord._id;
}

// Main analysis function that orchestrates the entire process
export async function performAnalysis(input: AnalysisInput) {
    // 1. Prepare document data
    const documentData = await prepareDocumentData(input);

    // 2. Run analysis
    const analysis = await runAnalysis(
        documentData.document,
        documentData.documentType,
        documentData.targetAudience,
        documentData.jurisdiction,
        documentData.regulations
    );

    // 3. Save to database
    const analysisId = await saveAnalysis(
        documentData.doc_id,
        documentData.documentType,
        documentData.targetAudience,
        documentData.jurisdiction,
        documentData.regulations,
        analysis
    );

    return { analysis, id: analysisId };
}
