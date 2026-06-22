import { z } from "zod";

import { ChatMessageSchema } from "../chat/types.js";
import type { ThemeBlueprint } from "../blueprint/types.js";
import type { StylePresetId } from "../presets.js";

export const UploadManifestSchema = z.object({
  mode: z.enum(["mock", "shopify"]),
  draftThemeId: z.string().nullable(),
  filesUploaded: z.array(z.string()),
  idempotentKey: z.string(),
});

export type UploadManifest = z.infer<typeof UploadManifestSchema>;

export const PreviewEditorMetaSchema = z.object({
  disabledSectionIds: z.array(z.string()).default([]),
  sectionOrder: z.array(z.string()).optional(),
  chatHistory: z.array(ChatMessageSchema).max(100).optional(),
});

export type PreviewEditorMeta = z.infer<typeof PreviewEditorMetaSchema>;

export const VisionOutputSchema = z.object({
  niche: z.string(),
  productSummary: z.string(),
  primaryColors: z.array(z.string()).min(1),
  tone: z.string(),
  targetAudience: z.string(),
});

export type VisionOutput = z.infer<typeof VisionOutputSchema>;

export const CopyOutputSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  benefits: z.array(z.string()).min(3),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(2),
  cta: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
});

export type CopyOutput = z.infer<typeof CopyOutputSchema>;

export const ImageAssetPlanSchema = z.object({
  role: z.enum(["hero", "lifestyle", "collection"]),
  prompt: z.string(),
  altText: z.string(),
  placeholderUrl: z.string().url().optional(),
});

export const ImageOutputSchema = z.object({
  assets: z.array(ImageAssetPlanSchema).min(1),
});

export type ImageOutput = z.infer<typeof ImageOutputSchema>;

export const LayoutOutputSchema = z.object({
  sectionOrder: z.array(z.string()).min(1),
  spacingScale: z.enum(["compact", "balanced", "airy"]),
  hierarchyNotes: z.string(),
  heroSectionType: z.string(),
});

export type LayoutOutput = z.infer<typeof LayoutOutputSchema>;

export const AssetIntentSchema = z.object({
  section_type:     z.string(),    // exact Base Theme handle
  forge_slot:       z.string(),    // exact setting ID from section schema (e.g. "image")
  image_mood:       z.string(),
  shot_style:       z.string(),
  lighting_style:   z.string(),
  background_style: z.string(),
});

export type AssetIntent = z.infer<typeof AssetIntentSchema>;

export const CompilerOutputSchema = z.object({
  indexJson: z.object({
    sections: z.record(z.unknown()),
    order: z.array(z.string()),
  }),
  settingsPatch: z.record(z.unknown()),
  cssVariables: z.record(z.string()),
  assetIntents: z.array(AssetIntentSchema).optional(),
});

export type CompilerOutput = z.infer<typeof CompilerOutputSchema>;

export const LiveThemeMetaSchema = z.object({
  themeId: z.string().nullable(),
  compiler: CompilerOutputSchema,
  lastAppliedAt: z.string().datetime().optional(),
});

export type LiveThemeMeta = z.infer<typeof LiveThemeMetaSchema>;

export const PreviewApprovalMetaSchema = z.object({
  approvedAt: z.string().datetime().optional(),
  approvedBy: z.string().optional(),
});

export type PreviewApprovalMeta = z.infer<typeof PreviewApprovalMetaSchema>;

export const ValidationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["error", "warning"]),
});

export const ValidationOutputSchema = z.object({
  passed: z.boolean(),
  issues: z.array(ValidationIssueSchema),
});

export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;

export const AgentOutputsSchema = z.object({
  vision: VisionOutputSchema.optional(),
  copy: CopyOutputSchema.optional(),
  image: ImageOutputSchema.optional(),
  layout: LayoutOutputSchema.optional(),
  compiler: CompilerOutputSchema.optional(),
  upload: UploadManifestSchema.optional(),
  validation: ValidationOutputSchema.optional(),
  previewEditor: PreviewEditorMetaSchema.optional(),
  liveTheme: LiveThemeMetaSchema.optional(),
  approval: PreviewApprovalMetaSchema.optional(),
});

export type AgentOutputs = z.infer<typeof AgentOutputsSchema>;

export interface AgentPipelineInput {
  projectId: string;
  shop: string;
  productIds: string[];
  stylePreset: StylePresetId;
  blueprint: ThemeBlueprint;
  products?: unknown[];
}

export const RunPipelineRequestSchema = z.object({
  shop: z.string().min(1),
  products: z.array(z.unknown()).optional(),
});

export type RunPipelineRequest = z.infer<typeof RunPipelineRequestSchema>;

export const RunPipelineResponseSchema = z.object({
  projectId: z.string().uuid(),
  status: z.string(),
  mode: z.enum(["queued", "sync"]).optional(),
  message: z.string().optional(),
  jobs: z
    .array(
      z.object({
        type: z.string(),
        status: z.string(),
      }),
    )
    .optional(),
  validationPassed: z.boolean().optional(),
});

export type RunPipelineResponse = z.infer<typeof RunPipelineResponseSchema>;
