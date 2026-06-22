import { z } from "zod";

// ─── L4: Variant Catalog Schema ───────────────────────────────────────────────
// Variants are ALTERNATE SECTION HANDLES that serve the same semantic role.
// e.g. "editorial-hero", "hero-split", "hero-wave" are all hero variants.
// No invented sub-layout names. All section_type values are exact Base Theme handles.

// New canonical model: sections grouped by semantic family
export const VariantSectionEntrySchema = z.object({
  section_type: z.string(),    // exact Base Theme section handle (filename without .liquid)
  schema_name: z.string(),     // exact schema "name" field from {% schema %}
  preset_scores: z.object({
    "high-converting": z.number().min(0).max(100),
    "fashion": z.number().min(0).max(100),
    "minimal-modern": z.number().min(0).max(100),
  }),
});

export type VariantSectionEntry = z.infer<typeof VariantSectionEntrySchema>;

export const VariantFamilyCatalogSchema = z.object({
  family: z.string(),                      // e.g. "hero", "products", "social_proof"
  sections: z.array(VariantSectionEntrySchema),
});

export type VariantFamilyCatalog = z.infer<typeof VariantFamilyCatalogSchema>;

// Index: all variant families
export const VariantFamilyIndexSchema = z.object({
  generated_at: z.string(),
  families: z.array(VariantFamilyCatalogSchema),
});

export type VariantFamilyIndex = z.infer<typeof VariantFamilyIndexSchema>;

// Legacy type kept for backward compat during transition
export const SectionVariantSchema = z.object({
  variant_id: z.string(),
  variant_name: z.string(),
  variant_type: z.string(),
  description: z.string(),
  layout_hint: z.string(),
  recommended_for_presets: z.array(z.string()),
  settings_overrides: z.record(z.unknown()),
  min_blocks: z.number().optional(),
  max_blocks: z.number().optional(),
});

export type SectionVariant = z.infer<typeof SectionVariantSchema>;

export const VariantCatalogSchema = z.record(z.array(SectionVariantSchema));
export type VariantCatalog = z.infer<typeof VariantCatalogSchema>;

export const SectionVariantFamilySchema = z.object({
  family: z.string(),
  base_section_type: z.string(),
  variants: z.array(SectionVariantSchema),
});

export type SectionVariantFamily = z.infer<typeof SectionVariantFamilySchema>;
