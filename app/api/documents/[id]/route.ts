import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/client";
import { Document, Analysis } from "@/lib/db/models";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();

    try {
        const doc_id = params.id;

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
