import { z } from "zod";

import { STYLE_PRESETS } from "../presets.js";

const stylePresetIds = STYLE_PRESETS.map((p) => p.id) as [
  string,
  ...string[],
];

export const InitiateProjectRequestSchema = z.object({
  productIds: z
    .array(z.string().min(1))
    .min(1, "At least one product is required")
    .max(5, "Maximum 5 products allowed"),
  stylePreset: z.enum(stylePresetIds),
  shop: z.string().min(1, "Shop domain is required"),
  accessToken: z.string().min(1).optional(),
});

export type InitiateProjectRequest = z.infer<
  typeof InitiateProjectRequestSchema
>;

export const InitiateProjectResponseSchema = z.object({
  projectId: z.string().uuid(),
  status: z.string(),
  message: z.string(),
  draftThemeId: z.string().nullable().optional(),
  blueprintSectionCount: z.number().int().optional(),
  pipelineMode: z.enum(["queued", "sync"]).optional(),
});

export type InitiateProjectResponse = z.infer<
  typeof InitiateProjectResponseSchema
>;

export const ProjectStatusResponseSchema = z.object({
  projectId: z.string().uuid(),
  status: z.string(),
  jobs: z.array(
    z.object({
      type: z.string(),
      status: z.string(),
    }),
  ),
  latestProgress: z
    .object({
      step: z.string(),
      message: z.string(),
      status: z.string(),
    })
    .optional(),
});

export const ProjectEventsResponseSchema = z.object({
  projectId: z.string().uuid(),
  events: z.array(
    z.object({
      id: z.string(),
      step: z.string(),
      message: z.string(),
      status: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export type ProjectEventsResponse = z.infer<
  typeof ProjectEventsResponseSchema
>;

export type ProjectStatusResponse = z.infer<
  typeof ProjectStatusResponseSchema
>;

export const ProjectListItemSchema = z.object({
  projectId: z.string().uuid(),
  status: z.string(),
  stylePreset: z.string(),
  productCount: z.number().int(),
  draftThemeId: z.string().nullable(),
  ready: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;

export const ProjectListResponseSchema = z.object({
  shop: z.string(),
  projects: z.array(ProjectListItemSchema),
});

export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

export const ProjectPreviewMetadataSchema = z.object({
  stylePreset: z.string(),
  headline: z.string().optional(),
  sectionTypes: z.array(z.string()),
  validationPassed: z.boolean(),
  productCount: z.number().int(),
});

export type ProjectPreviewMetadata = z.infer<
  typeof ProjectPreviewMetadataSchema
>;

export const ProjectPreviewResponseSchema = z.object({
  projectId: z.string().uuid(),
  ready: z.boolean(),
  draftThemeId: z.string().nullable(),
  previewUrl: z.string().url().nullable(),
  adminEditorUrl: z.string().url().nullable(),
  blueprintSectionCount: z.number().int(),
  message: z.string(),
  previewMode: z.enum(["storefront", "mock", "editor"]),
  metadata: ProjectPreviewMetadataSchema.optional(),
});

export type ProjectPreviewResponse = z.infer<
  typeof ProjectPreviewResponseSchema
>;
