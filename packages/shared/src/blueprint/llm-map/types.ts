import { z } from "zod";

export const SettingRoleSchema = z.enum([
  "headline",
  "subheadline",
  "cta",
  "button_background",
  "button_text",
  "color_scheme",
  "image",
  "spacing",
  "size",
  "color",
  "text",
  "url",
  "boolean",
  "collection",
  "product",
  "video",
  "richtext",
  "other",
]);

export type SettingRole = z.infer<typeof SettingRoleSchema>;

export const SectionCategorySchema = z.enum([
  "hero",
  "social_proof",
  "trust",
  "products",
  "lead_capture",
  "urgency",
  "faq",
  "storytelling",
  "content",
]);

export type SectionCategory = z.infer<typeof SectionCategorySchema>;

export const SectionFamilySchema = z.enum([
  "hero",
  "products",
  "trust",
  "social_proof",
  "urgency",
  "storytelling",
  "content",
  "lead_capture",
  "faq",
  "footer",
  "navigation",
  "promotion",
]);

export type SectionFamily = z.infer<typeof SectionFamilySchema>;

export const SectionRoleSchema = z.enum([
  "hero",
  "social_proof",
  "conversion",
  "navigation",
  "content",
]);

export type SectionRole = z.infer<typeof SectionRoleSchema>;

export const SettingDefSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  default: z.unknown().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  role: SettingRoleSchema,
  info: z.string().optional(),
});

export type SettingDef = z.infer<typeof SettingDefSchema>;

export const BlockDefSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  settings: z.array(SettingDefSchema),
});

export type BlockDef = z.infer<typeof BlockDefSchema>;

export const SectionPresetSchema = z.object({
  name: z.string(),
  settings: z.record(z.unknown()).optional(),
  blocks: z
    .array(z.object({ type: z.string(), settings: z.record(z.unknown()).optional() }))
    .optional(),
});

export const LlmSectionSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  category: SectionCategorySchema,
  section_id: z.string().optional(),
  section_role: SectionRoleSchema.optional(),
  section_family: SectionFamilySchema.optional(),
  priority_score: z.number().min(0).max(100).optional(),
  required: z.boolean().optional(),
  purpose: z.string(),
  recommendedPosition: z.array(z.string()),
  maxBlocks: z.number().optional(),
  forgeSlots: z.array(z.string()),
  settings: z.array(SettingDefSchema),
  blocks: z.array(BlockDefSchema),
  presets: z.array(SectionPresetSchema).optional(),
});

export type LlmSection = z.infer<typeof LlmSectionSchema>;

export const LlmBlockSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  settings: z.array(SettingDefSchema),
});

export type LlmBlock = z.infer<typeof LlmBlockSchema>;

export const FontTokenSchema = z.object({
  settingId: z.string(),
  value: z.string(),
  role: z.string().optional(),
});

export const TypographyScaleEntrySchema = z.object({
  size: z.string().optional(),
  font: z.string().optional(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
});

export const ButtonColorsSchema = z.object({
  background: z.string().optional(),
  text: z.string().optional(),
  border: z.string().optional(),
});

export const DesignTokensSchema = z.object({
  colors: z.object({
    schemes: z.record(z.record(z.string())),
    activeScheme: z.string(),
  }),
  typography: z.object({
    fonts: z.record(FontTokenSchema),
    scale: z.record(TypographyScaleEntrySchema),
  }),
  buttons: z.object({
    shape: z.string().optional(),
    globalBorderRadius: z.number().optional(),
    customRadius: z.number().optional(),
    primary: ButtonColorsSchema,
    secondary: ButtonColorsSchema,
  }),
  cards: z.object({
    gap: z.number().optional(),
    shadow: z.string().optional(),
    style: z.string().optional(),
    card2: z.record(z.unknown()).optional(),
  }),
  spacing: z.object({
    pageWidth: z.string().optional(),
    cardGap: z.string().optional(),
  }),
  radius: z.record(z.number()),
});

export type DesignTokens = z.infer<typeof DesignTokensSchema>;

export const LandingPageRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stylePresets: z.array(z.string()),
  sectionOrder: z.array(z.string()),
});

export type LandingPageRecipe = z.infer<typeof LandingPageRecipeSchema>;

export const ThemeLlmMapMetaSchema = z.object({
  themeName: z.string(),
  themeVersion: z.string(),
  generatedAt: z.string(),
  sectionCount: z.number(),
  blockCount: z.number(),
  sourcePath: z.string(),
});

export const ThemeLlmMapSchema = z.object({
  meta: ThemeLlmMapMetaSchema,
  designTokens: DesignTokensSchema,
  sections: z.array(LlmSectionSchema),
  blocks: z.array(LlmBlockSchema),
  landingPageCatalog: z.array(LlmSectionSchema),
  landingPageRecipes: z.array(LandingPageRecipeSchema),
  referenceHomepage: z.object({
    sections: z.record(z.unknown()),
    order: z.array(z.string()),
  }),
});

export type ThemeLlmMap = z.infer<typeof ThemeLlmMapSchema>;

export const LlmPromptContextSchema = z.object({
  designTokens: DesignTokensSchema,
  landingPageCatalog: z.array(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      category: SectionCategorySchema,
      purpose: z.string(),
      recommendedPosition: z.array(z.string()),
      settings: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          role: SettingRoleSchema,
          default: z.unknown().optional(),
          label: z.string().optional(),
        }),
      ),
    }),
  ),
  recipe: LandingPageRecipeSchema.optional(),
  allowedSectionTypes: z.array(z.string()),
});

export type LlmPromptContext = z.infer<typeof LlmPromptContextSchema>;

/** Raw Shopify schema JSON from {% schema %} blocks */
export type ShopifySettingJson = {
  type?: string;
  id?: string;
  label?: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  info?: string;
  options?: Array<{ value?: string; label?: string }>;
};

export type ShopifyBlockSchemaJson = {
  type: string;
  name?: string;
  settings?: ShopifySettingJson[];
};

export type ShopifySectionSchemaJson = {
  name?: string;
  settings?: ShopifySettingJson[];
  blocks?: ShopifyBlockSchemaJson[];
  max_blocks?: number;
  presets?: Array<{
    name?: string;
    settings?: Record<string, unknown>;
    blocks?: Array<{ type: string; settings?: Record<string, unknown> }>;
  }>;
};
