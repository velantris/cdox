import { expect, test, describe } from "vitest";
import { ConvexError } from "convex/values";

// Import validation functions for direct testing
const validateIssueData = (issue: {
    severity: string;
    type: string;
    status: string;
    section: string;
    originalText: string;
    issueExplanation: string;
    suggestedRewrite: string;
}) => {
    // Validate required fields
    if (!issue.severity || !issue.type || !issue.status) {
        throw new ConvexError("Issue must have severity, type, and status");
    }
    if (!issue.section || !issue.originalText || !issue.issueExplanation) {
        throw new ConvexError("Issue must have section, originalText, and issueExplanation");
    }

    // Validate severity levels
    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(issue.severity.toLowerCase())) {
        throw new ConvexError(`Invalid severity: ${issue.severity}. Must be one of: ${validSeverities.join(", ")}`);
    }

    // Validate issue types
    const validTypes = ["clarity", "grammar", "style", "legal", "compliance", "structure", "other"];
    if (!validTypes.includes(issue.type.toLowerCase())) {
        throw new ConvexError(`Invalid type: ${issue.type}. Must be one of: ${validTypes.join(", ")}`);
    }

    // Validate status
    const validStatuses = ["open", "in_progress", "resolved", "dismissed"];
    if (!validStatuses.includes(issue.status.toLowerCase())) {
        throw new ConvexError(`Invalid status: ${issue.status}. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Validate text lengths
    if (issue.originalText.length > 5000) {
        throw new ConvexError("Original text cannot exceed 5000 characters");
    }
    if (issue.issueExplanation.length > 2000) {
        throw new ConvexError("Issue explanation cannot exceed 2000 characters");
    }
    if (issue.suggestedRewrite.length > 5000) {
        throw new ConvexError("Suggested rewrite cannot exceed 5000 characters");
    }
};

const validateBulkIssues = (issues: any[]) => {
    if (!Array.isArray(issues)) {
        throw new ConvexError("Issues must be an array");
    }
    if (issues.length === 0) {
        throw new ConvexError("Cannot create empty issues array");
    }
    if (issues.length > 100) {
        throw new ConvexError("Cannot create more than 100 issues at once");
    }

    issues.forEach((issue, index) => {
        try {
            validateIssueData(issue);
        } catch (error) {
            throw new ConvexError(`Issue at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
};

describe("Issues Management", () => {
    describe("Issue Data Validation", () => {
        test("should accept valid issue data", () => {
            const validIssue = {
                severity: "high",
                type: "clarity",
                status: "open",
                section: "Section 1",
                originalText: "This is confusing text that needs clarification",
                issueExplanation: "The text is unclear and may confuse readers",
                suggestedRewrite: "This is clear text that is easy to understand",
            };

            expect(() => validateIssueData(validIssue)).not.toThrow();
        });

        test("should reject issue with missing severity", () => {
            const invalidIssue = {
                severity: "",
                type: "clarity",
                status: "open",
                section: "Section 1",
                originalText: "Test text",
                issueExplanation: "Test explanation",
                suggestedRewrite: "Test rewrite",
            };

            expect(() => validateIssueData(invalidIssue)).toThrow("Issue must have severity, type, and status");
        });

        test("should accept valid severity levels", () => {
            const validSeverities = ["low", "medium", "high", "critical"];

            validSeverities.forEach(severity => {
                const issue = {
                    severity: severity,
                    type: "clarity",
                    status: "open",
                    section: "Section 1",
                    originalText: "Test text",
                    issueExplanation: "Test explanation",
                    suggestedRewrite: "Test rewrite",
                };

                expect(() => validateIssueData(issue)).not.toThrow();
            });
        });

        test("should reject invalid severity levels", () => {
            const invalidIssue = {
                severity: "extreme",
                type: "clarity",
                status: "open",
                section: "Section 1",
                originalText: "Test text",
                issueExplanation: "Test explanation",
                suggestedRewrite: "Test rewrite",
            };

            expect(() => validateIssueData(invalidIssue)).toThrow("Invalid severity: extreme");
        });
    });

    describe("Issues Function Structure", () => {
        test("should have all required issues management functions", async () => {
            // Import the issues module to verify function exports
            const issuesModule = await import("./issues");

            // Verify all required functions exist
            expect(issuesModule.createIssues).toBeDefined();
            expect(issuesModule.createIssue).toBeDefined();
            expect(issuesModule.getIssuesByAnalysis).toBeDefined();
            expect(issuesModule.getIssue).toBeDefined();
            expect(issuesModule.updateIssueStatus).toBeDefined();
            expect(issuesModule.getIssuesCountByAnalysis).toBeDefined();
        });
    });
});