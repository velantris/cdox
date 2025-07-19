import connectDB from "@/lib/db/client";
import { Analysis, Document, Issue } from "@/lib/db/models";
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
        
        let issues = [];
        if (analysis) {
            issues = await Issue.find({ analysis_id: analysis.analysis_id }).sort({ createdAt: 1 });
        }

        return NextResponse.json({ document, analysis, issues });

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
    
    // Update issue status in the separate Issues collection
    const updatedIssue = await Issue.findOneAndUpdate(
        { issue_id: issueId },
        { status, updatedAt: new Date() },
        { new: true }
    );
    
    if (!updatedIssue) {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    
    return NextResponse.json({ issue: updatedIssue });
}
