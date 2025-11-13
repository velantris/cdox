import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

type SeverityWeights = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type CategoryWeights = {
  clarity: number;
  grammar: number;
  style: number;
  legal: number;
  compliance: number;
  structure: number;
  accessibility: number;
  security: number;
  transparency: number;
  other: number;
};

type Thresholds = {
  pass: number;
  warning: number;
  fail: number;
};

const severityWeightsValidator = v.object({
  critical: v.number(),
  high: v.number(),
  medium: v.number(),
  low: v.number(),
});

const categoryWeightsValidator = v.object({
  clarity: v.number(),
  grammar: v.number(),
  style: v.number(),
  legal: v.number(),
  compliance: v.number(),
  structure: v.number(),
  accessibility: v.number(),
  security: v.number(),
  transparency: v.number(),
  other: v.number(),
});

const thresholdsValidator = v.object({
  pass: v.number(),
  warning: v.number(),
  fail: v.number(),
});

function validateSeverityWeights(weights: SeverityWeights) {
  Object.entries(weights).forEach(([key, value]) => {
    if (value < 0 || value > 50) {
      throw new ConvexError(`Severity weight for ${key} must be between 0 and 50.`);
    }
  });
}

function validateCategoryWeights(weights: CategoryWeights) {
  Object.entries(weights).forEach(([key, value]) => {
    if (value < 0.5 || value > 2) {
      throw new ConvexError(`Category weight for ${key} must be between 0.5 and 2.0.`);
    }
  });
}

function validateThresholds(thresholds: Thresholds) {
  const { pass, warning, fail } = thresholds;
  const inRange = [pass, warning, fail].every((value) => value >= 0 && value <= 100);
  if (!inRange) {
    throw new ConvexError("Threshold values must be between 0 and 100.");
  }
  if (!(pass >= warning && warning > fail)) {
    throw new ConvexError("Thresholds must satisfy pass ≥ warning > fail.");
  }
}

async function demoteExistingDefaults(ctx: { db: any }, excludeId?: string) {
  const currentDefaults = await ctx.db
    .query("scoringConfigs")
    .withIndex("by_default", (q) => q.eq("isDefault", true))
    .collect();

  await Promise.all(
    currentDefaults
      .filter((config) => (excludeId ? String(config._id) !== excludeId : true))
      .map((config) =>
        ctx.db.patch(config._id, {
          isDefault: false,
          updatedAt: Date.now(),
        }),
      ),
  );
}

export const getScoringConfigs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scoringConfigs").order("desc").collect();
  },
});

export const getDefaultConfig = query({
  args: {},
  handler: async (ctx) => {
    const defaultConfig = await ctx.db
      .query("scoringConfigs")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    if (defaultConfig) {
      return defaultConfig;
    }

    return await ctx.db.query("scoringConfigs").order("desc").first();
  },
});

export const getScoringConfig = query({
  args: { id: v.id("scoringConfigs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createScoringConfig = mutation({
  args: {
    name: v.string(),
    isDefault: v.boolean(),
    severityWeights: severityWeightsValidator,
    categoryWeights: categoryWeightsValidator,
    thresholds: thresholdsValidator,
  },
  handler: async (ctx, args) => {
    const trimmedName = args.name.trim();
    if (!trimmedName.length) {
      throw new ConvexError("Configuration name is required.");
    }

    validateSeverityWeights(args.severityWeights as SeverityWeights);
    validateCategoryWeights(args.categoryWeights as CategoryWeights);
    validateThresholds(args.thresholds as Thresholds);

    const timestamp = Date.now();
    const existingConfigs = await ctx.db.query("scoringConfigs").collect();
    const shouldSetDefault = args.isDefault || existingConfigs.length === 0;

    if (shouldSetDefault) {
      await demoteExistingDefaults(ctx);
    }

    const duplicateName = existingConfigs.find(
      (config) => config.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicateName) {
      throw new ConvexError("A scoring configuration with this name already exists.");
    }

    const id = await ctx.db.insert("scoringConfigs", {
      name: trimmedName,
      isDefault: shouldSetDefault,
      severityWeights: args.severityWeights,
      categoryWeights: args.categoryWeights,
      thresholds: args.thresholds,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return id;
  },
});

export const updateScoringConfig = mutation({
  args: {
    id: v.id("scoringConfigs"),
    name: v.string(),
    isDefault: v.boolean(),
    severityWeights: severityWeightsValidator,
    categoryWeights: categoryWeightsValidator,
    thresholds: thresholdsValidator,
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.id);
    if (!config) {
      throw new ConvexError("Scoring configuration not found.");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName.length) {
      throw new ConvexError("Configuration name is required.");
    }

    validateSeverityWeights(args.severityWeights as SeverityWeights);
    validateCategoryWeights(args.categoryWeights as CategoryWeights);
    validateThresholds(args.thresholds as Thresholds);

    const timestamp = Date.now();

    const otherConfigWithName = await ctx.db
      .query("scoringConfigs")
      .filter((q) => q.eq(q.field("name"), trimmedName))
      .collect();

    if (otherConfigWithName.some((item) => String(item._id) !== String(args.id))) {
      throw new ConvexError("A scoring configuration with this name already exists.");
    }

    if (args.isDefault) {
      await demoteExistingDefaults(ctx, String(args.id));
    } else if (!args.isDefault) {
      const defaults = await ctx.db
        .query("scoringConfigs")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .collect();
      const onlyDefault = defaults.length === 1 && String(defaults[0]._id) === String(args.id);
      if (onlyDefault) {
        throw new ConvexError("At least one scoring configuration must remain default.");
      }
    }

    await ctx.db.patch(args.id, {
      name: trimmedName,
      isDefault: args.isDefault,
      severityWeights: args.severityWeights,
      categoryWeights: args.categoryWeights,
      thresholds: args.thresholds,
      updatedAt: timestamp,
    });

    return args.id;
  },
});


