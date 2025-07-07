import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/client";
import { Document } from "@/lib/db/models";

export async function GET(request: NextRequest) {
    await connectDB();

    try {
        const documents = await Document.find({}).sort({ createdAt: -1 });
        return NextResponse.json(documents);
    } catch (error) {
        console.error("Failed to fetch documents:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}