import connectDB from "@/lib/db/client";
import { Issue } from "@/lib/db/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    await connectDB();
    
    try {
        const { searchParams } = new URL(request.url);
        const analysis_id = searchParams.get('analysis_id');
        
        if (!analysis_id) {
            return NextResponse.json({ error: "analysis_id is required" }, { status: 400 });
        }
        
        const issues = await Issue.find({ analysis_id }).sort({ createdAt: 1 });
        return NextResponse.json({ issues });
        
    } catch (error) {
        console.error("Failed to fetch issues:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    await connectDB();
    
    try {
        const issueData = await request.json();
        
        if (!issueData.analysis_id) {
            return NextResponse.json({ error: "analysis_id is required" }, { status: 400 });
        }
        
        const issue = new Issue(issueData);
        await issue.save();
        
        return NextResponse.json({ issue }, { status: 201 });
        
    } catch (error) {
        console.error("Failed to create issue:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
