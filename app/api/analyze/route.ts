import { performAnalysis, type AnalysisInput } from "@/lib/analysis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    console.log("Analyze route called");

    try {
        // Check environment variables first
        const requiredEnvVars = ['MONGO_URI'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            console.error("Missing environment variables:", missingVars);
            return NextResponse.json({
                error: `Missing environment variables: ${missingVars.join(', ')}`
            }, { status: 500 });
        }

        const input: AnalysisInput = await request.json();
        console.log("Input received:", input);

        const result = await performAnalysis(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Analyze route error:", error);
        const message = error instanceof Error ? error.message : "Unknown error occurred";

        if (message === "Document not found") {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        if (message === "No document content supplied or retrievable." ||
            message === "Failed to parse analysis response from both models.") {
            return NextResponse.json({ error: message }, { status: 400 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}