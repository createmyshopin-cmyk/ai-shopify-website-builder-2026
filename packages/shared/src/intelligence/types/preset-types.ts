import { z } from "zod";

import { SectionFamilySchema } from "./index-types.js";
import { TokenRefsSchema } from "./token-types.js";

// ─── L3: Preset Catalog Schema ────────────────────────────────────────────────

export const PresetIdSchema = z.enum(["high-converting", "fashion", "minimal-modern"]);
export type PresetId = z.infer<typeof PresetIdSchema>;

export const SectionCountRulesSchema = z.object({
  min_sections: z.number(),
  max_sections: z.number(),
});

export const PresetCharacteristicsSchema = z.object({
  typography_style: z.string(),
  color_palette_guidance: z.string(),
  spacing_scale: z.enum(["compact", "balanced", "airy"]),
  animation_intensity: z.enum(["none", "subtle", "expressive"]),
  image_treatment: z.string(),
  cro_emphasis: z.string(),
});

// Copy Intelligence: preset-specific LLM copy guidance
export const CopyIntelligenceSchema = z.object({
  headline_style: z.string(),       // e.g. "bold imperative" | "aspirational editorial"
  description_style: z.string(),
  cta_style: z.string(),
  social_proof_style: z.string(),
  urgency_style: z.string().nullable(),
  emotion_style: z.string(),        // e.g. "trustworthy" | "aspirational" | "minimal"
});

export type CopyIntelligence = z.infer<typeof CopyIntelligenceSchema>;

export const PresetSlotSchema = z.object({
  slot: z.number(),
  section_family: SectionFamilySchema,
  preferred_section_type: z.string(),     // exact Base Theme section handle
  preferred_variant: z.string().optional(), // now optional — VariantSelectionService chooses
  required: z.boolean(),
});

export type PresetSlot = z.infer<typeof PresetSlotSchema>;

export const PresetCatalogSchema = z.object({
  id: PresetIdSchema,
  name: z.string(),
  description: z.string(),
  focus: z.array(z.string()),
  section_count_rules: SectionCountRulesSchema,
  characteristics: PresetCharacteristicsSchema,
  copy_intelligence: CopyIntelligenceSchema,
  token_refs: TokenRefsSchema,
  section_flow: z.array(PresetSlotSchema),
  excluded_section_families: z.array(SectionFamilySchema),
});

export type PresetCatalog = z.infer<typeof PresetCatalogSchema>;

export const PresetFlowSchema = z.object({
  preset_id: PresetIdSchema,
  slots: z.array(PresetSlotSchema),
  required_count: z.number(),
  optional_count: z.number(),
  min_sections: z.number(),
  max_sections: z.number(),
});

export type PresetFlow = z.infer<typeof PresetFlowSchema>;
