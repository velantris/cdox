import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// Validation helpers
const validateScanData = (args: {
  name: string;
  url: string;
  language: string;
  documentType: string;
  targetAudience: string;
  jurisdiction: string;
  regulations: string;
}) => {
  // Validate required fields are not empty
  if (!args.name.trim()) {
    throw new ConvexError("Scan name cannot be empty");
  }

  if (!args.url.trim()) {
    throw new ConvexError("Document URL cannot be empty");
  }

  if (!args.language.trim()) {
    throw new ConvexError("Language cannot be empty");
  }

  if (!args.documentType.trim()) {
    throw new ConvexError("Document type cannot be empty");
  }

  // Validate URL format - allow both HTTP URLs and local file paths
  const isHttpUrl = args.url.startsWith("http://") || args.url.startsWith("https://");
  const isLocalPath = !isHttpUrl;

  if (isHttpUrl) {
    try {
      new URL(args.url);
    } catch {
      throw new ConvexError("Invalid URL format");
    }
  } else if (isLocalPath) {
    // For local paths, we can't easily validate file existence in Convex mutations
    // This validation would need to be done in the frontend or in an action
    if (!args.url.match(/\.(pdf|docx?|txt)$/i)) {
      throw new ConvexError("Local file must have a supported extension (.pdf, .docx, .doc, .txt)");
    }
  }

  // Validate language is supported
  const supportedLanguages = ["english", "spanish", "french", "german", "italian", "portuguese"];
  if (!supportedLanguages.includes(args.language.toLowerCase())) {
    throw new ConvexError(`Unsupported language: ${args.language}. Supported languages: ${supportedLanguages.join(", ")}`);
  }

  // Validate document type
  const supportedDocTypes = ["terms", "privacy", "loan", "fee", "disclosure", "other"];
  if (!supportedDocTypes.includes(args.documentType.toLowerCase())) {
    throw new ConvexError(`Unsupported document type: ${args.documentType}. Supported types: ${supportedDocTypes.join(", ")}`);
  }

  // Validate name length
  if (args.name.length > 200) {
    throw new ConvexError("Scan name cannot exceed 200 characters");
  }
};

// Query to get all scans with optional filtering
export const getScans = query({
  args: {
    limit: v.optional(v.number()),
    documentType: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("scans").order("desc");

    // Apply filters if provided
    if (args.documentType) {
      query = query.filter((q) => q.eq(q.field("documentType"), args.documentType));
    }

    if (args.language) {
      query = query.filter((q) => q.eq(q.field("language"), args.language));
    }

    // Apply limit if provided, default to 50
    const limit = args.limit || 50;
    return await query.take(limit);
  },
});

// Query to get a specific scan by ID
export const getScan = query({
  args: { id: v.id("scans") },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.id);
    if (!scan) {
      throw new ConvexError("Scan not found");
    }
    return scan;
  },
});

// Query to get scan details with related analysis count
export const getScanWithDetails = query({
  args: { id: v.id("scans") },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.id);
    if (!scan) {
      throw new ConvexError("Scan not found");
    }

    // Get count of related analyses
    const analysisCount = await ctx.db
      .query("analysis")
      .withIndex("by_scan", (q) => q.eq("scanId", args.id))
      .collect()
      .then(results => results.length);

    return {
      ...scan,
      analysisCount,
    };
  },
});

// Mutation to create a new scan
export const createScan = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    fileId: v.optional(v.id("_storage")),
    language: v.string(),
    documentType: v.string(),
    targetAudience: v.string(),
    jurisdiction: v.string(),
    regulations: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate input data
    validateScanData(args);

    // Check for duplicate URLs (only if URL is provided)
    if (args.url) {
      const existingScan = await ctx.db
        .query("scans")
        .filter((q) => q.eq(q.field("url"), args.url))
        .first();

      if (existingScan) {
        throw new ConvexError("A scan with this URL already exists");
      }
    }

    const scanId = await ctx.db.insert("scans", {
      ...args,
      createdAt: Date.now(),
    });

    return scanId;
  },
});

// Internal mutation to create a new scan (for use by actions)
export const createScanInternal = internalMutation({
  args: {
    name: v.string(),
    url: v.string(),
    fileId: v.optional(v.id("_storage")),
    language: v.string(),
    documentType: v.string(),
    targetAudience: v.string(),
    jurisdiction: v.string(),
    regulations: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate input data
    validateScanData(args);

    // Check for duplicate URLs (only if URL is provided)
    if (args.url) {
      const existingScan = await ctx.db
        .query("scans")
        .filter((q) => q.eq(q.field("url"), args.url))
        .first();

      if (existingScan) {
        throw new ConvexError("A scan with this URL already exists");
      }
    }

    const scanId = await ctx.db.insert("scans", {
      ...args,
      createdAt: Date.now(),
    });

    return scanId;
  },
});

// Mutation to update an existing scan
export const updateScan = mutation({
  args: {
    id: v.id("scans"),
    name: v.optional(v.string()),
    language: v.optional(v.string()),
    documentType: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    jurisdiction: v.optional(v.string()),
    regulations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Check if scan exists
    const existingScan = await ctx.db.get(id);
    if (!existingScan) {
      throw new ConvexError("Scan not found");
    }

    // Create updated scan data for validation
    const updatedScanData = {
      name: updates.name || existingScan.name,
      url: existingScan.url, // URL cannot be updated
      language: updates.language || existingScan.language,
      documentType: updates.documentType || existingScan.documentType,
      targetAudience: updates.targetAudience || existingScan.targetAudience,
      jurisdiction: updates.jurisdiction || existingScan.jurisdiction,
      regulations: updates.regulations || existingScan.regulations,
    };

    // Validate the updated data
    validateScanData(updatedScanData);

    // Remove undefined values from updates
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);

    return id;
  },
});

// Mutation to delete a scan
export const deleteScan = mutation({
  args: { id: v.id("scans") },
  handler: async (ctx, args) => {
    // Check if scan exists
    const scan = await ctx.db.get(args.id);
    if (!scan) {
      throw new ConvexError("Scan not found");
    }

    // Check if scan has related analyses
    const relatedAnalyses = await ctx.db
      .query("analysis")
      .withIndex("by_scan", (q) => q.eq("scanId", args.id))
      .collect();

    if (relatedAnalyses.length > 0) {
      throw new ConvexError("Cannot delete scan with existing analyses. Delete analyses first.");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Query to get recent scans for dashboard
export const getRecentScans = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("scans")
      .order("desc")
      .take(limit);
  },
});

// Query to get dashboard data with aggregated statistics
export const getDashboardData = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get recent scans
    const recentScans = await ctx.db
      .query("scans")
      .order("desc")
      .take(limit);

    // Get all analyses and issues for statistics
    const allAnalyses = await ctx.db.query("analysis").collect();
    const allIssues = await ctx.db.query("issues").collect();

    // Build analysis map by scan ID
    const analysisByScan = new Map();
    allAnalyses.forEach(analysis => {
      if (!analysisByScan.has(analysis.scanId)) {
        analysisByScan.set(analysis.scanId, []);
      }
      analysisByScan.get(analysis.scanId).push(analysis);
    });

    // Build issues map by analysis ID
    const issuesByAnalysis = new Map();
    allIssues.forEach(issue => {
      if (!issuesByAnalysis.has(issue.analysisId)) {
        issuesByAnalysis.set(issue.analysisId, []);
      }
      issuesByAnalysis.get(issue.analysisId).push(issue);
    });

    // Process recent scans with their data
    const scansWithData = recentScans.map(scan => {
      const scanAnalyses = analysisByScan.get(scan._id) || [];
      const latestAnalysis = scanAnalyses.length > 0
        ? scanAnalyses.sort((a: any, b: any) => b.createdAt - a.createdAt)[0]
        : null;

      const issues = latestAnalysis
        ? (issuesByAnalysis.get(latestAnalysis._id) || [])
        : [];

      return {
        ...scan,
        latestAnalysis,
        issueCount: issues.length,
        issues: issues,
      };
    });

    // Calculate aggregate statistics
    const stats = {
      totalScans: recentScans.length,
      totalAnalyses: allAnalyses.length,
      totalIssues: allIssues.length,
      averageScore: 0,
      issuesBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    // Calculate average score and issue counts
    const scores = allAnalyses
      .filter(a => typeof a.score === 'number')
      .map(a => a.score);

    if (scores.length > 0) {
      stats.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // Count issues by severity
    allIssues.forEach(issue => {
      const severity = issue.severity.toLowerCase();
      if (severity in stats.issuesBySeverity) {
        stats.issuesBySeverity[severity as keyof typeof stats.issuesBySeverity]++;
      }
    });

    return {
      scans: scansWithData,
      stats,
    };
  },
});

// Query to get scan with analysis and issues (equivalent to /api/documents/[id])
export const getScanWithAnalysisAndIssues = query({
  args: { id: v.id("scans") },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.id);
    if (!scan) {
      throw new ConvexError("Scan not found");
    }

    // Get the most recent analysis for this scan
    const analysis = await ctx.db
      .query("analysis")
      .withIndex("by_scan", (q) => q.eq("scanId", args.id))
      .order("desc")
      .first();

    let issues: any[] = [];
    if (analysis) {
      issues = await ctx.db
        .query("issues")
        .withIndex("by_analysis", (q) => q.eq("analysisId", analysis._id))
        .order("asc")
        .collect();
    }

    return {
      document: scan, // Keep the same structure as the API
      analysis,
      issues,
    };
  },
});

// Query to get scans with their latest analysis and issue counts (optimized for documents page)
export const getScansWithAnalysisData = query({
  args: {
    limit: v.optional(v.number()),
    documentType: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("scans").order("desc");

    // Apply filters if provided
    if (args.documentType) {
      query = query.filter((q) => q.eq(q.field("documentType"), args.documentType));
    }

    if (args.language) {
      query = query.filter((q) => q.eq(q.field("language"), args.language));
    }

    // Apply limit if provided, default to 50
    const limit = args.limit || 50;
    const scans = await query.take(limit);

    // For each scan, get the latest analysis and issue count
    const scansWithData = await Promise.all(
      scans.map(async (scan) => {
        // Get the most recent analysis for this scan
        const latestAnalysis = await ctx.db
          .query("analysis")
          .withIndex("by_scan", (q) => q.eq("scanId", scan._id))
          .order("desc")
          .first();

        let issueCount = 0;
        if (latestAnalysis) {
          const issues = await ctx.db
            .query("issues")
            .withIndex("by_analysis", (q) => q.eq("analysisId", latestAnalysis._id))
            .collect();
          issueCount = issues.length;
        }

        return {
          ...scan,
          latestAnalysis,
          issueCount,
        };
      })
    );

    return scansWithData;
  },
});

// Query to get scan statistics
export const getScanStats = query({
  args: {},
  handler: async (ctx) => {
    const allScans = await ctx.db.query("scans").collect();

    const stats = {
      total: allScans.length,
      byDocumentType: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      recentCount: 0, // scans created in last 7 days
    };

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    allScans.forEach(scan => {
      // Count by document type
      stats.byDocumentType[scan.documentType] = (stats.byDocumentType[scan.documentType] || 0) + 1;

      // Count by language
      stats.byLanguage[scan.language] = (stats.byLanguage[scan.language] || 0) + 1;

      // Count recent scans
      if (scan.createdAt > sevenDaysAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  },
});