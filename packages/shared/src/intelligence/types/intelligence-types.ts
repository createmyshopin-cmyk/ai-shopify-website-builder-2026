import { z } from "zod";

import { SectionFamilySchema } from "./index-types.js";

// ─── L5: Design Intelligence Graph ────────────────────────────────────────────

export const DesignIntelligenceSchema = z.object({
  // Relationship Graph
  compatible_sections: z.array(z.string()),
  incompatible_sections: z.array(z.string()),
  recommended_order: z.number(),
  previous_section: z.array(z.string()),
  next_section: z.array(z.string()),

  // Theme Flow Graph (NEW)
  allowed_before: z.array(SectionFamilySchema),
  allowed_after: z.array(SectionFamilySchema),
  recommended_before: z.array(SectionFamilySchema),
  recommended_after: z.array(SectionFamilySchema),

  // Content Intelligence
  visual_weight: z.enum(["light", "medium", "heavy"]),
  content_density: z.enum(["sparse", "moderate", "dense"]),
  recommended_heading_length: z.string(),
  recommended_image_count: z.number(),

  // Preset Scoring (0–100)
  high_converting_score: z.number().min(0).max(100),
  fashion_score: z.number().min(0).max(100),
  minimal_modern_score: z.number().min(0).max(100),

  // AI Metadata
  section_purpose: z.string(),
  design_intent: z.string(),
  emotional_goal: z.string(),
  conversion_goal: z.string(),

  // Theme Intelligence
  visual_rhythm: z.enum(["static", "rhythmic", "dynamic"]),
  whitespace_density: z.enum(["tight", "balanced", "generous"]),
  animation_intensity: z.enum(["none", "subtle", "expressive"]),
  hierarchy_rules: z.string(),
  theme_personality: z.string(),
});

export type DesignIntelligence = z.infer<typeof DesignIntelligenceSchema>;

export const SlotEntrySchema = z.object({
  slot: z.number(),
  section_type: z.string(),
  section_family: SectionFamilySchema,
  variant: z.string(),
  required: z.boolean(),
  priority_score: z.number(),
  conversion_score: z.number(),
  visual_weight: z.enum(["light", "medium", "heavy"]),
  previous_slot_family: SectionFamilySchema.nullable(),
  next_slot_family: SectionFamilySchema.nullable(),
});

export type SlotEntry = z.infer<typeof SlotEntrySchema>;

export const RelationshipFlowSchema = z.object({
  preset_id: z.string(),
  generated_at: z.string(),
  total_slots: z.number(),
  required_slots: z.number(),
  slots: z.array(SlotEntrySchema),
});

export type RelationshipFlow = z.infer<typeof RelationshipFlowSchema>;
