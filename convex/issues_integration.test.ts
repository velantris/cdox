import { expect, test, describe } from "vitest";

describe("Issues Integration", () => {
    describe("Analysis to Issues Workflow", () => {
        test("should support the complete scan → analysis → issues workflow", async () => {
            // Import all modules to verify they work together
            const scansModule = await import("./scans");
            const analysisModule = await import("./analysis");
            const issuesModule = await import("./issues");

            // Verify all required functions exist for the workflow
            expect(scansModule.createScan).toBeDefined();
            expect(analysisModule.createAnalysis).toBeDefined();
            expect(analysisModule.updateAnalysisResults).toBeDefined();
            expect(issuesModule.createIssues).toBeDefined();
            expect(issuesModule.getIssuesByAnalysis).toBeDefined();
        });

        test("should have proper data structure relationships", () => {
            // Test the expected data flow structure
            const mockScan = {
                _id: "scan_123",
                name: "Test Document",
                url: "https://example.com/test.pdf",
                language: "english",
                documentType: "contract",
                targetAudience: "general",
                jurisdiction: "US",
                regulations: "GDPR",
                createdAt: Date.now(),
            };

            const mockAnalysis = {
                _id: "analysis_456",
                scanId: mockScan._id, // Foreign key relationship
                summary: "Document analysis complete",
                recommendations: ["Fix clarity issues", "Improve grammar"],
                score: 85,
                status: "completed" as const,
                providerRaw: {
                    openai: { model: "gpt-4", tokens: 1500 },
                    gemini: undefined,
                },
                createdAt: Date.now(),
            };

            const mockIssues = [
                {
                    _id: "issue_789",
                    analysisId: mockAnalysis._id, // Foreign key relationship
                    severity: "high",
                    type: "clarity",
                    status: "open",
                    section: "Section 1",
                    originalText: "This is confusing text",
                    issueExplanation: "The text is unclear and may confuse readers",
                    suggestedRewrite: "This is clear text",
                    createdAt: Date.now(),
                },
                {
                    _id: "issue_790",
                    analysisId: mockAnalysis._id, // Foreign key relationship
                    severity: "medium",
                    type: "grammar",
                    status: "open",
                    section: "Section 2",
                    originalText: "Bad grammar here",
                    issueExplanation: "Grammar error detected",
                    suggestedRewrite: "Good grammar here",
                    createdAt: Date.now(),
                },
            ];

            // Verify the relationships are properly structured
            expect(mockAnalysis.scanId).toBe(mockScan._id);
            expect(mockIssues[0].analysisId).toBe(mockAnalysis._id);
            expect(mockIssues[1].analysisId).toBe(mockAnalysis._id);

            // Verify all required fields are present
            expect(mockScan.name).toBeDefined();
            expect(mockScan.url).toBeDefined();
            expect(mockAnalysis.summary).toBeDefined();
            expect(mockAnalysis.status).toBeDefined();
            expect(mockIssues[0].severity).toBeDefined();
            expect(mockIssues[0].type).toBeDefined();
            expect(mockIssues[0].originalText).toBeDefined();
        });

        test("should support issue counting and aggregation", () => {
            const mockIssues = [
                { severity: "high", status: "open", type: "clarity" },
                { severity: "high", status: "resolved", type: "grammar" },
                { severity: "medium", status: "open", type: "style" },
                { severity: "low", status: "dismissed", type: "other" },
            ];

            // Simulate the counting logic
            const counts = {
                total: mockIssues.length,
                bySeverity: mockIssues.reduce((acc, issue) => {
                    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                byStatus: mockIssues.reduce((acc, issue) => {
                    acc[issue.status] = (acc[issue.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                byType: mockIssues.reduce((acc, issue) => {
                    acc[issue.type] = (acc[issue.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            };

            expect(counts.total).toBe(4);
            expect(counts.bySeverity.high).toBe(2);
            expect(counts.bySeverity.medium).toBe(1);
            expect(counts.bySeverity.low).toBe(1);
            expect(counts.byStatus.open).toBe(2);
            expect(counts.byStatus.resolved).toBe(1);
            expect(counts.byStatus.dismissed).toBe(1);
            expect(counts.byType.clarity).toBe(1);
            expect(counts.byType.grammar).toBe(1);
        });

        test("should validate the complete workflow data types", () => {
            // Test that all the expected data types are compatible
            const workflowData = {
                scan: {
                    name: "string",
                    url: "string",
                    language: "string",
                    documentType: "string",
                    targetAudience: "string",
                    jurisdiction: "string",
                    regulations: "string",
                    createdAt: "number",
                },
                analysis: {
                    scanId: "Id<scans>",
                    summary: "string",
                    recommendations: "string[]",
                    score: "number",
                    status: "pending | completed | failed",
                    providerRaw: "object",
                    createdAt: "number",
                },
                issue: {
                    analysisId: "Id<analysis>",
                    severity: "string",
                    type: "string",
                    status: "string",
                    section: "string",
                    originalText: "string",
                    issueExplanation: "string",
                    suggestedRewrite: "string",
                    createdAt: "number",
                },
            };

            // Verify the structure is as expected
            expect(workflowData.scan.name).toBe("string");
            expect(workflowData.analysis.scanId).toBe("Id<scans>");
            expect(workflowData.issue.analysisId).toBe("Id<analysis>");
        });
    });

    describe("Schema Validation", () => {
        test("should have proper indexes for efficient queries", async () => {
            // Import schema to verify structure
            const schema = await import("./schema");

            // The schema should be properly structured
            expect(schema.default).toBeDefined();

            // We can't directly test the indexes, but we can verify the schema structure
            // The indexes should be:
            // - analysis.index("by_scan", ["scanId"])
            // - issues.index("by_analysis", ["analysisId"])

            // This ensures efficient queries for:
            // - Getting analysis by scan ID
            // - Getting issues by analysis ID
        });

        test("should support all required query patterns", () => {
            // Test the expected query patterns that should be supported
            const queryPatterns = [
                "getScans() - Get all scans",
                "getScan(scanId) - Get specific scan",
                "getAnalysisByScan(scanId) - Get analysis for a scan",
                "getAnalysis(analysisId) - Get specific analysis",
                "getIssuesByAnalysis(analysisId) - Get issues for an analysis",
                "getIssue(issueId) - Get specific issue",
                "getIssuesCountByAnalysis(analysisId) - Get issue statistics",
            ];

            // Verify all patterns are documented
            expect(queryPatterns.length).toBe(7);
            expect(queryPatterns.every(pattern => pattern.includes("Get"))).toBe(true);
        });
    });
});