import { v } from "convex/values";
import { action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Action to handle file upload to Convex storage and create scan record
export const uploadDocument = action({
    args: {
        filename: v.string(),
        fileData: v.bytes(),
        contentType: v.string(),
        scanMetadata: v.object({
            name: v.string(),
            language: v.string(),
            documentType: v.string(),
            targetAudience: v.string(),
            jurisdiction: v.string(),
            regulations: v.string(),
        }),
    },
    handler: async (ctx, args): Promise<{
        scanId: Id<"scans">;
        fileId: Id<"_storage">;
        url: string;
    }> => {
        try {
            // Validate filename
            if (!args.filename.trim()) {
                throw new ConvexError("Filename cannot be empty");
            }

            // Validate file data
            if (!args.fileData || args.fileData.byteLength === 0) {
                throw new ConvexError("No file content provided");
            }

            // Upload file to Convex storage
            const fileId = await ctx.storage.store(new Blob([args.fileData], {
                type: args.contentType
            }));

            // Get the file URL for the scan record (for backward compatibility)
            const fileUrl = await ctx.storage.getUrl(fileId);
            if (!fileUrl) {
                throw new ConvexError("Failed to get file URL after upload");
            }

            // Create scan record with both file ID and URL
            const scanId: Id<"scans"> = await ctx.runMutation(internal.scans.createScanInternal, {
                name: args.scanMetadata.name,
                url: fileUrl, // Keep for backward compatibility
                fileId: fileId, // New Convex storage reference
                language: args.scanMetadata.language,
                documentType: args.scanMetadata.documentType,
                targetAudience: args.scanMetadata.targetAudience,
                jurisdiction: args.scanMetadata.jurisdiction,
                regulations: args.scanMetadata.regulations,
            });

            return {
                scanId,
                fileId,
                url: fileUrl,
            };
        } catch (error) {
            console.error("Upload error:", error);
            if (error instanceof ConvexError) {
                throw error;
            }
            throw new ConvexError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// Action to handle simple file upload without creating scan (for backward compatibility)
export const uploadFile = action({
    args: {
        filename: v.string(),
        fileData: v.bytes(),
        contentType: v.string(),
    },
    handler: async (ctx, args): Promise<{
        fileId: Id<"_storage">;
        url: string;
    }> => {
        try {
            // Validate filename
            if (!args.filename.trim()) {
                throw new ConvexError("Filename cannot be empty");
            }

            // Validate file data
            if (!args.fileData || args.fileData.byteLength === 0) {
                throw new ConvexError("No file content provided");
            }

            // Upload file to Convex storage
            const fileId = await ctx.storage.store(new Blob([args.fileData], {
                type: args.contentType
            }));

            // Get the file URL
            const fileUrl = await ctx.storage.getUrl(fileId);
            if (!fileUrl) {
                throw new ConvexError("Failed to get file URL after upload");
            }

            return {
                fileId,
                url: fileUrl,
            };
        } catch (error) {
            console.error("Upload error:", error);
            if (error instanceof ConvexError) {
                throw error;
            }
            throw new ConvexError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});