import { z } from "zod";

/** PRD drag-and-drop section examples — filtered against blueprint at runtime. */
export const PRD_SECTION_PICKER_TYPES = [
  "editorial-hero",
  "image-banner",
  "rich-text",
  "featured-collection",
  "featured-product-grid-v2",
  "faq-v2",
  "video",
  "testimonials",
  "section",
] as const;

export const PreviewSectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  enabled: z.boolean(),
  settings: z.record(z.unknown()),
});

export type PreviewSection = z.infer<typeof PreviewSectionSchema>;

export const PreviewStateSchema = z.object({
  projectId: z.string().uuid(),
  order: z.array(z.string()),
  sections: z.array(PreviewSectionSchema),
  settingsPatch: z.record(z.unknown()),
  cssVariables: z.record(z.string()),
  availableSectionTypes: z.array(z.string()),
});

export type PreviewState = z.infer<typeof PreviewStateSchema>;

export const PreviewPatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("reorder"),
    order: z.array(z.string()).min(1),
  }),
  z.object({
    op: z.literal("updateSection"),
    sectionId: z.string(),
    settings: z.record(z.unknown()),
  }),
  z.object({
    op: z.literal("toggleSection"),
    sectionId: z.string(),
    enabled: z.boolean(),
  }),
  z.object({
    op: z.literal("addSection"),
    sectionType: z.string(),
    afterSectionId: z.string().optional(),
  }),
  z.object({
    op: z.literal("updateTheme"),
    settingsPatch: z.record(z.unknown()).optional(),
    cssVariables: z.record(z.string()).optional(),
  }),
  z.object({
    op: z.literal("restore"),
    snapshot: PreviewStateSchema,
  }),
]);

export type PreviewPatch = z.infer<typeof PreviewPatchSchema>;

export const PreviewPatchRequestSchema = z.object({
  patch: PreviewPatchSchema,
});

export type PreviewPatchRequest = z.infer<typeof PreviewPatchRequestSchema>;

export const PreviewStateResponseSchema = z.object({
  projectId: z.string().uuid(),
  editable: z.boolean(),
  state: PreviewStateSchema,
});

export type PreviewStateResponse = z.infer<typeof PreviewStateResponseSchema>;

export const PreviewPatchResponseSchema = z.object({
  projectId: z.string().uuid(),
  state: PreviewStateSchema,
  uploaded: z.boolean(),
});

export type PreviewPatchResponse = z.infer<typeof PreviewPatchResponseSchema>;
