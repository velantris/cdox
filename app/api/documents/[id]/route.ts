import connectDB from "@/lib/db/client";
import { Analysis, Document } from "@/lib/db/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();

    try {
        const { id } = await params;
        const doc_id = id;

        if (!doc_id) {
            return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
        }

        const document = await Document.findOne({ doc_id: doc_id });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const analysis = await Analysis.findOne({ doc_id: doc_id }).sort({ createdAt: -1 });

        return NextResponse.json({ document, analysis });

    } catch (error) {
        console.error(`Failed to fetch document ${params.id}:`, error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Add PATCH handler to update issue status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();
    const { id: doc_id } = await params;
    const { issueId, status } = await request.json();
    if (!issueId || !status) {
        return NextResponse.json({ error: "issueId and status are required" }, { status: 400 });
    }
    const analysisRecord = await Analysis.findOne({ doc_id }).sort({ createdAt: -1 });
    if (!analysisRecord) {
        return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    // Update issue status in the analysis document
    const updatedIssues = (analysisRecord.analysis as any).issues.map((iss: any) =>
        iss.id === issueId ? { ...iss, status } : iss
    );
    (analysisRecord.analysis as any).issues = updatedIssues;
    await analysisRecord.save();
    return NextResponse.json({ analysis: analysisRecord });
}
