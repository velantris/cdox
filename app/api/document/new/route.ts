import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/client";
import { Document } from "@/lib/db/models";

export async function POST(request: NextRequest) {
    await connectDB();

    try {
        const { title, url, options, userId } = await request.json();

        if (!title || !url) {
            return NextResponse.json({ error: "Missing required fields: title and url." }, { status: 400 });
        }

        const newDocument = await Document.create({
            title,
            url,
            options: options || {},
            userId: userId || "user-placeholder", // Replace with actual user ID from session
        });

        return NextResponse.json(newDocument);
    } catch (error) {
        console.error("Document creation error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
