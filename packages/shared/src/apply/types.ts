import { z } from "zod";

import { CompilerOutputSchema } from "../agents/types.js";
import { PreviewStateSchema } from "../preview/types.js";

export const ThemeSnapshotSchema = z.object({
  themeId: z.string().nullable(),
  compiler: CompilerOutputSchema,
  capturedAt: z.string().datetime(),
  source: z.enum(["live", "preview", "backup", "version"]),
  label: z.string().max(120).optional(),
});

export type ThemeSnapshot = z.infer<typeof ThemeSnapshotSchema>;

export const ApplyProjectRequestSchema = z.object({
  projectId: z.string().uuid(),
  approved: z.literal(true, {
    errorMap: () => ({ message: "Merchant approval is required before apply" }),
  }),
});

export type ApplyProjectRequest = z.infer<typeof ApplyProjectRequestSchema>;

export const ApplyProjectResponseSchema = z.object({
  projectId: z.string().uuid(),
  status: z.literal("APPLIED"),
  versionNumber: z.number().int().positive(),
  backupId: z.string().uuid(),
  themeId: z.string().nullable(),
  mode: z.enum(["mock", "shopify"]),
  message: z.string(),
});

export type ApplyProjectResponse = z.infer<typeof ApplyProjectResponseSchema>;

export const CreateVersionRequestSchema = z.object({
  projectId: z.string().uuid(),
  label: z.string().max(120).optional(),
});

export type CreateVersionRequest = z.infer<typeof CreateVersionRequestSchema>;

export const CreateVersionResponseSchema = z.object({
  projectId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  snapshot: ThemeSnapshotSchema,
});

export type CreateVersionResponse = z.infer<typeof CreateVersionResponseSchema>;

export const RollbackRequestSchema = z.object({
  projectId: z.string().uuid(),
  versionNumber: z.number().int().positive().optional(),
});

export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;

export const RollbackResponseSchema = z.object({
  projectId: z.string().uuid(),
  restoredVersion: z.number().int().positive().nullable(),
  backupId: z.string().uuid().optional(),
  themeId: z.string().nullable(),
  mode: z.enum(["mock", "shopify"]),
  message: z.string(),
});

export type RollbackResponse = z.infer<typeof RollbackResponseSchema>;

export const VersionListItemSchema = z.object({
  versionNumber: z.number().int().positive(),
  createdAt: z.string(),
  createdBy: z.string(),
  label: z.string().optional(),
});

export type VersionListItem = z.infer<typeof VersionListItemSchema>;

export const VersionListResponseSchema = z.object({
  projectId: z.string().uuid(),
  versions: z.array(VersionListItemSchema),
});

export type VersionListResponse = z.infer<typeof VersionListResponseSchema>;
