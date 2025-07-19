import connectDB from "@/lib/db/client";
import { Issue } from "@/lib/db/models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();
    
    try {
        const { id } = await params;
        const issue = await Issue.findOne({ issue_id: id });
        
        if (!issue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }
        
        return NextResponse.json({ issue });
        
    } catch (error) {
        console.error(`Failed to fetch issue ${params.id}:`, error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();
    
    try {
        const { id } = await params;
        const updateData = await request.json();
        
        const issue = await Issue.findOneAndUpdate(
            { issue_id: id },
            { ...updateData, updatedAt: new Date() },
            { new: true }
        );
        
        if (!issue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }
        
        return NextResponse.json({ issue });
        
    } catch (error) {
        console.error(`Failed to update issue ${params.id}:`, error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    await connectDB();
    
    try {
        const { id } = await params;
        const issue = await Issue.findOneAndDelete({ issue_id: id });
        
        if (!issue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }
        
        return NextResponse.json({ message: "Issue deleted successfully" });
        
    } catch (error) {
        console.error(`Failed to delete issue ${params.id}:`, error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
