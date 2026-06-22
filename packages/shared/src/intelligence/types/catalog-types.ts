import { z } from "zod";

import { SectionFamilySchema, SectionRoleSchema } from "./index-types.js";
import { TokenRefsSchema } from "./token-types.js";

// ─── L2: Section Catalog Schema ───────────────────────────────────────────────

export const SectionIdentitySchema = z.object({
  merchant_goal: z.string(),
  conversion_goal: z.string(),
});

export const SectionLayoutMetaSchema = z.object({
  desktop_layout: z.string(),
  tablet_layout: z.string(),
  mobile_layout: z.string(),
  alignment_rules: z.string(),
  content_hierarchy: z.string(),
});

export const SectionSpacingMetaSchema = z.object({
  section_padding_top: z.number(),
  section_padding_bottom: z.number(),
  block_spacing: z.number(),
  grid_spacing: z.number(),
  image_spacing: z.number(),
});

export const SectionTypographyMetaSchema = z.object({
  heading_font: z.string(),
  subheading_font: z.string(),
  body_font: z.string(),
  heading_size: z.string(),
  subheading_size: z.string(),
  body_size: z.string(),
  font_weight: z.string(),
  line_height: z.string(),
  letter_spacing: z.string(),
});

export const SectionColorMetaSchema = z.object({
  background_color: z.string(),
  text_color: z.string(),
  heading_color: z.string(),
  secondary_text_color: z.string(),
  accent_color: z.string(),
  border_color: z.string(),
});

export const SectionButtonMetaSchema = z.object({
  primary_button_color: z.string(),
  primary_button_text_color: z.string(),
  secondary_button_color: z.string(),
});

export const SectionCardMetaSchema = z.object({
  border_radius: z.number(),
  shadow_style: z.string(),
  elevation: z.string(),
  hover_effect: z.string(),
});

export const SectionAnimationMetaSchema = z.object({
  reveal_animation: z.string(),
  hover_animation: z.string(),
  transition_duration: z.number(),
});

export const SectionImageMetaSchema = z.object({
  image_ratio: z.string(),
  image_shape: z.string(),
  image_treatment: z.string(),
});

export const SectionCommerceMetaSchema = z.object({
  product_card_style: z.string(),
  price_style: z.string(),
  badge_style: z.string(),
  discount_style: z.string(),
  add_to_cart_style: z.string(),
});

export const SectionTrustMetaSchema = z.object({
  ratings: z.boolean(),
  reviews: z.boolean(),
  trust_badges: z.boolean(),
  guarantees: z.boolean(),
});

export const SectionSeoMetaSchema = z.object({
  semantic_role: z.string(),
  heading_hierarchy: z.string(),
  accessibility_rules: z.string(),
});

export const SectionMetadataSchema = z.object({
  identity: SectionIdentitySchema,
  layout: SectionLayoutMetaSchema,
  spacing: SectionSpacingMetaSchema,
  typography: SectionTypographyMetaSchema,
  colorSystem: SectionColorMetaSchema,
  buttons: SectionButtonMetaSchema,
  cards: SectionCardMetaSchema,
  animation: SectionAnimationMetaSchema,
  image: SectionImageMetaSchema,
  commerce: SectionCommerceMetaSchema,
  trust: SectionTrustMetaSchema,
  seo: SectionSeoMetaSchema,
});

export type SectionMetadata = z.infer<typeof SectionMetadataSchema>;

export const SectionCompatibilityScoresSchema = z.object({
  high_converting: z.number().min(0).max(100),
  fashion: z.number().min(0).max(100),
  minimal_modern: z.number().min(0).max(100),
});

export type SectionCompatibilityScores = z.infer<typeof SectionCompatibilityScoresSchema>;

export const SectionFlowRulesSchema = z.object({
  allowed_before: z.array(SectionFamilySchema),
  allowed_after: z.array(SectionFamilySchema),
  recommended_before: z.array(SectionFamilySchema),
  recommended_after: z.array(SectionFamilySchema),
});

export type SectionFlowRules = z.infer<typeof SectionFlowRulesSchema>;

// L6 Runtime Intelligence — static metadata derived from Base Theme section characteristics
export const RuntimeIntelligenceSchema = z.object({
  performance_tier: z.enum(["critical", "standard", "lazy"]),
  lcp_risk: z.enum(["high", "medium", "low"]),
  cls_risk: z.enum(["high", "medium", "low"]),
  lazy_load_strategy: z.enum(["viewport", "eager", "defer"]),
  preload_asset: z.boolean(),
  core_web_vitals_target: z.enum(["lcp", "cls", "fid"]).nullable(),
});

export type RuntimeIntelligence = z.infer<typeof RuntimeIntelligenceSchema>;

// Raw Base Theme section data (from parsed Liquid schema)
export const BaseThemeSettingSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
});

export const BaseThemeBlockSchema = z.object({
  type: z.string(),
  settings: z.array(z.object({ id: z.string(), type: z.string() })),
});

export const SectionCatalogSchema = z.object({
  section_id: z.string(),
  section_type: z.string(),
  section_path: z.string(),         // exact path e.g. "sections/editorial-hero.liquid"
  section_schema_name: z.string(),  // exact schema "name" from {% schema %}
  section_category: z.string(),
  section_role: SectionRoleSchema,
  section_family: SectionFamilySchema,
  section_max_blocks: z.number().nullable(),
  section_presets_raw: z.array(z.string()),     // exact preset names from schema
  section_settings_raw: z.array(BaseThemeSettingSchema),
  section_blocks_raw: z.array(BaseThemeBlockSchema),
  priority_score: z.number().min(0).max(100),
  required: z.boolean(),
  name: z.string().optional(),
  purpose: z.string(),
  metadata: SectionMetadataSchema,
  compatibility_scores: SectionCompatibilityScoresSchema,
  token_refs: TokenRefsSchema,
  flow_rules: SectionFlowRulesSchema,
  runtime_intelligence: RuntimeIntelligenceSchema,
});

export type SectionCatalog = z.infer<typeof SectionCatalogSchema>;
