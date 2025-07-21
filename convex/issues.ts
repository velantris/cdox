import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Issue data structure validator for bulk creation
const issueValidator = v.object({
  severity: v.string(),
  type: v.string(),
  status: v.optional(v.union(
    v.literal("open"),
    v.literal("inprogress"),
    v.literal("verified"),
    v.literal("closed"),
    v.literal("false_positive")
  )),
  section: v.string(),
  originalText: v.string(),
  issueExplanation: v.string(),
  suggestedRewrite: v.string(),
});

// Validation helper functions
const validateIssueData = (issue: {
  severity: string;
  type: string;
  status?: string;
  section: string;
  originalText: string;
  issueExplanation: string;
  suggestedRewrite: string;
}) => {
  // Validate required fields
  if (!issue.severity || !issue.type) {
    throw new Error("Issue must have severity and type");
  }
  if (!issue.section || !issue.originalText || !issue.issueExplanation) {
    throw new Error("Issue must have section, originalText, and issueExplanation");
  }

  // Validate severity levels
  const validSeverities = ["low", "medium", "high", "critical"];
  if (!validSeverities.includes(issue.severity.toLowerCase())) {
    throw new Error(`Invalid severity: ${issue.severity}. Must be one of: ${validSeverities.join(", ")}`);
  }

  // Validate issue types
  const validTypes = ["clarity", "grammar", "style", "legal", "compliance", "structure", "other"];
  if (!validTypes.includes(issue.type.toLowerCase())) {
    throw new Error(`Invalid type: ${issue.type}. Must be one of: ${validTypes.join(", ")}`);
  }

  // Validate status if provided
  if (issue.status) {
    const validStatuses = ["open", "inprogress", "verified", "closed", "false_positive"];
    if (!validStatuses.includes(issue.status)) {
      throw new Error(`Invalid status: ${issue.status}. Must be one of: ${validStatuses.join(", ")}`);
    }
  }

  // Validate text lengths
  if (issue.originalText.length > 5000) {
    throw new Error("Original text cannot exceed 5000 characters");
  }
  if (issue.issueExplanation.length > 2000) {
    throw new Error("Issue explanation cannot exceed 2000 characters");
  }
  if (issue.suggestedRewrite.length > 5000) {
    throw new Error("Suggested rewrite cannot exceed 5000 characters");
  }
};

// Query to get issues by analysis ID
export const getIssuesByAnalysis = query({
  args: { analysisId: v.id("analysis") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("issues")
      .withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
      .collect();
  },
});

// Query to get a specific issue by ID
export const getIssue = query({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Mutation for bulk issue creation
export const createIssues = mutation({
  args: {
    analysisId: v.id("analysis"),
    issues: v.array(issueValidator),
  },
  handler: async (ctx, args) => {
    // Verify the analysis exists
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    // Validate bulk issues constraints
    if (!Array.isArray(args.issues)) {
      throw new Error("Issues must be an array");
    }
    if (args.issues.length === 0) {
      throw new Error("Cannot create empty issues array");
    }
    if (args.issues.length > 100) {
      throw new Error("Cannot create more than 100 issues at once");
    }

    // Validate each issue data structure
    args.issues.forEach((issue, index) => {
      try {
        validateIssueData(issue);
      } catch (error) {
        throw new Error(`Issue at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Create all issues
    const issueIds = [];
    const currentTime = Date.now();

    for (const issue of args.issues) {
      const issueId = await ctx.db.insert("issues", {
        analysisId: args.analysisId,
        severity: issue.severity,
        type: issue.type,
        status: issue.status || "open",
        section: issue.section,
        originalText: issue.originalText,
        issueExplanation: issue.issueExplanation,
        suggestedRewrite: issue.suggestedRewrite,
        createdAt: currentTime,
      });
      issueIds.push(issueId);
    }

    return issueIds;
  },
});

// Mutation to create a single issue
export const createIssue = mutation({
  args: {
    analysisId: v.id("analysis"),
    severity: v.string(),
    type: v.string(),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("inprogress"),
      v.literal("verified"),
      v.literal("closed"),
      v.literal("false_positive")
    )),
    section: v.string(),
    originalText: v.string(),
    issueExplanation: v.string(),
    suggestedRewrite: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the analysis exists
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis) {
      throw new Error("Analysis not found");
    }

    // Validate issue data
    validateIssueData({
      severity: args.severity,
      type: args.type,
      status: args.status,
      section: args.section,
      originalText: args.originalText,
      issueExplanation: args.issueExplanation,
      suggestedRewrite: args.suggestedRewrite,
    });

    const issueId = await ctx.db.insert("issues", {
      analysisId: args.analysisId,
      severity: args.severity,
      type: args.type,
      status: args.status || "open",
      section: args.section,
      originalText: args.originalText,
      issueExplanation: args.issueExplanation,
      suggestedRewrite: args.suggestedRewrite,
      createdAt: Date.now(),
    });

    return issueId;
  },
});

// Mutation to update issue status
export const updateIssueStatus = mutation({
  args: {
    id: v.id("issues"),
    status: v.union(
      v.literal("open"),
      v.literal("inprogress"),
      v.literal("verified"),
      v.literal("closed"),
      v.literal("false_positive")
    ),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.id);
    if (!issue) {
      throw new Error("Issue not found");
    }

    await ctx.db.patch(args.id, { status: args.status });
    return args.id;
  },
});

// Mutation to update an issue (equivalent to PATCH /api/issues/[id])
export const updateIssue = mutation({
  args: {
    id: v.id("issues"),
    severity: v.optional(v.string()),
    type: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("inprogress"),
      v.literal("verified"),
      v.literal("closed"),
      v.literal("false_positive")
    )),
    section: v.optional(v.string()),
    originalText: v.optional(v.string()),
    issueExplanation: v.optional(v.string()),
    suggestedRewrite: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const issue = await ctx.db.get(id);
    if (!issue) {
      throw new Error("Issue not found");
    }

    // Remove undefined values from updates
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanUpdates).length === 0) {
      throw new Error("No valid updates provided");
    }

    // Validate updated data if provided
    if (cleanUpdates.severity || cleanUpdates.type || cleanUpdates.status) {
      const updatedIssue = {
        severity: cleanUpdates.severity || issue.severity,
        type: cleanUpdates.type || issue.type,
        status: cleanUpdates.status || issue.status,
        section: cleanUpdates.section || issue.section,
        originalText: cleanUpdates.originalText || issue.originalText,
        issueExplanation: cleanUpdates.issueExplanation || issue.issueExplanation,
        suggestedRewrite: cleanUpdates.suggestedRewrite || issue.suggestedRewrite,
      };

      validateIssueData(updatedIssue);
    }

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

// Mutation to delete an issue (equivalent to DELETE /api/issues/[id])
export const deleteIssue = mutation({
  args: { id: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.id);
    if (!issue) {
      throw new Error("Issue not found");
    }

    await ctx.db.delete(args.id);
    return { message: "Issue deleted successfully" };
  },
});

// Query to get issues count by analysis ID
export const getIssuesCountByAnalysis = query({
  args: { analysisId: v.id("analysis") },
  handler: async (ctx, args) => {
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
      .collect();

    return {
      total: issues.length,
      bySeverity: issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: issues.reduce((acc, issue) => {
        acc[issue.status] = (acc[issue.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});