import { z } from "zod";

// ─── L1: Section Family + Index Entry Types ───────────────────────────────────

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

export const SectionIndexEntrySchema = z.object({
  section_id: z.string(),
  section_type: z.string(),
  section_category: z.string(),
  section_role: SectionRoleSchema,
  section_family: SectionFamilySchema,
  priority_score: z.number().min(0).max(100),
  required: z.boolean(),
  name: z.string().optional(),
  purpose: z.string(),
});

export type SectionIndexEntry = z.infer<typeof SectionIndexEntrySchema>;

export const PresetIndexEntrySchema = z.object({
  preset_id: z.enum(["high-converting", "fashion", "minimal-modern"]),
  name: z.string(),
  description: z.string(),
  min_sections: z.number(),
  max_sections: z.number(),
  focus: z.array(z.string()),
});

export type PresetIndexEntry = z.infer<typeof PresetIndexEntrySchema>;

export const VariantIndexEntrySchema = z.object({
  family: z.string(),
  section_type: z.string(),
  schema_name: z.string(),
  preset_scores: z.record(z.number()),
});

export type VariantIndexEntry = z.infer<typeof VariantIndexEntrySchema>;

export const TokenIndexEntrySchema = z.object({
  token_id: z.string(),
  token_category: z.enum(["colors", "typography", "spacing", "radius", "shadows", "buttons", "animations"]),
  value: z.string(),
  description: z.string().optional(),
});

export type TokenIndexEntry = z.infer<typeof TokenIndexEntrySchema>;

export const RelationshipIndexEntrySchema = z.object({
  preset_id: z.string(),
  slot_count: z.number(),
  flow_file: z.string(),
});

export type RelationshipIndexEntry = z.infer<typeof RelationshipIndexEntrySchema>;

export const SectionIndexSchema = z.object({
  generated_at: z.string(),
  count: z.number(),
  sections: z.array(SectionIndexEntrySchema),
});

export type SectionIndex = z.infer<typeof SectionIndexSchema>;

export const PresetIndexSchema = z.object({
  generated_at: z.string(),
  presets: z.array(PresetIndexEntrySchema),
});

export type PresetIndex = z.infer<typeof PresetIndexSchema>;

export const VariantIndexSchema = z.object({
  generated_at: z.string(),
  count: z.number(),
  variants: z.array(VariantIndexEntrySchema),
});

export type VariantIndex = z.infer<typeof VariantIndexSchema>;

export const TokenIndexSchema = z.object({
  generated_at: z.string(),
  count: z.number(),
  tokens: z.array(TokenIndexEntrySchema),
});

export type TokenIndex = z.infer<typeof TokenIndexSchema>;

export const RelationshipIndexSchema = z.object({
  generated_at: z.string(),
  flows: z.array(RelationshipIndexEntrySchema),
});

export type RelationshipIndex = z.infer<typeof RelationshipIndexSchema>;
