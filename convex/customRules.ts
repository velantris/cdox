import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get all custom rules
export const getAllCustomRules = query({
    handler: async (ctx) => {
        return await ctx.db.query("customRules").collect();
    },
});

// Query to get active custom rules only
export const getActiveCustomRules = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("customRules")
            .filter((q) => q.eq(q.field("active"), true))
            .collect();
    },
});

// Query to get a specific rule by ID
export const getCustomRule = query({
    args: { id: v.id("customRules") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Mutation to create a new custom rule
export const createCustomRule = mutation({
    args: {
        name: v.string(),
        pattern: v.string(),
        type: v.union(
            v.literal("keyword"),
            v.literal("regex"),
            v.literal("phrase")
        ),
        label: v.string(),
        severity: v.union(
            v.literal("Critical"),
            v.literal("High"),
            v.literal("Medium"),
            v.literal("Low")
        ),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const currentDate = new Date().toISOString().split("T")[0];

        const ruleId = await ctx.db.insert("customRules", {
            name: args.name,
            pattern: args.pattern,
            type: args.type,
            label: args.label,
            severity: args.severity,
            description: args.description,
            active: true,
            created: currentDate,
            lastModified: currentDate,
        });

        return ruleId;
    },
});

// Mutation to update an existing custom rule
export const updateCustomRule = mutation({
    args: {
        id: v.id("customRules"),
        name: v.optional(v.string()),
        pattern: v.optional(v.string()),
        type: v.optional(v.union(
            v.literal("keyword"),
            v.literal("regex"),
            v.literal("phrase")
        )),
        label: v.optional(v.string()),
        severity: v.optional(v.union(
            v.literal("Critical"),
            v.literal("High"),
            v.literal("Medium"),
            v.literal("Low")
        )),
        description: v.optional(v.string()),
        active: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        const rule = await ctx.db.get(id);
        if (!rule) {
            throw new Error("Custom rule not found");
        }

        // Remove undefined values from updates
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("No valid updates provided");
        }

        // Add lastModified date
        cleanUpdates.lastModified = new Date().toISOString().split("T")[0];

        await ctx.db.patch(id, cleanUpdates);
        return id;
    },
});

// Mutation to toggle rule active status
export const toggleRuleStatus = mutation({
    args: {
        id: v.id("customRules"),
    },
    handler: async (ctx, args) => {
        const rule = await ctx.db.get(args.id);
        if (!rule) {
            throw new Error("Custom rule not found");
        }

        await ctx.db.patch(args.id, {
            active: !rule.active,
            lastModified: new Date().toISOString().split("T")[0]
        });

        return args.id;
    },
});

// Mutation to delete a custom rule
export const deleteCustomRule = mutation({
    args: { id: v.id("customRules") },
    handler: async (ctx, args) => {
        const rule = await ctx.db.get(args.id);
        if (!rule) {
            throw new Error("Custom rule not found");
        }

        await ctx.db.delete(args.id);
        return { message: "Custom rule deleted successfully" };
    },
});