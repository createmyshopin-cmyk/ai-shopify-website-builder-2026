import type { RelationshipFlow, SlotEntry } from "../types/intelligence-types.js";
import type { SectionFamily } from "../types/index-types.js";
import {
  HIGH_CONVERTING_PRESET,
  FASHION_PRESET,
  MINIMAL_MODERN_PRESET,
} from "./build-preset-catalogs.js";
import type { PresetCatalog } from "../types/preset-types.js";

// ─── L5: Build Relationship Graph ─────────────────────────────────────────────
// Deterministic scoring + flow rules per preset. No AI calls.

const CONVERSION_SCORE_BY_FAMILY: Record<SectionFamily, number> = {
  hero: 90,
  products: 85,
  trust: 95,
  social_proof: 80,
  urgency: 100,
  storytelling: 40,
  content: 60,
  lead_capture: 80,
  faq: 65,
  footer: 50,
  navigation: 20,
  promotion: 75,
};

const VISUAL_WEIGHT_BY_FAMILY: Record<SectionFamily, "light" | "medium" | "heavy"> = {
  hero: "heavy",
  products: "heavy",
  trust: "light",
  social_proof: "medium",
  urgency: "medium",
  storytelling: "heavy",
  content: "light",
  lead_capture: "medium",
  faq: "light",
  footer: "light",
  navigation: "light",
  promotion: "medium",
};

function buildRelationshipFlow(preset: PresetCatalog): RelationshipFlow {
  const slots: SlotEntry[] = preset.section_flow.map((slot, index) => {
    const prevSlot = preset.section_flow[index - 1];
    const nextSlot = preset.section_flow[index + 1];
    const family = slot.section_family;

    return {
      slot: slot.slot,
      section_type: slot.preferred_section_type,
      section_family: family,
      variant: slot.preferred_variant ?? slot.preferred_section_type,
      required: slot.required,
      priority_score: slot.required ? 100 : 60,
      conversion_score: CONVERSION_SCORE_BY_FAMILY[family] ?? 50,
      visual_weight: VISUAL_WEIGHT_BY_FAMILY[family] ?? "medium",
      previous_slot_family: prevSlot?.section_family ?? null,
      next_slot_family: nextSlot?.section_family ?? null,
    };
  });

  const requiredSlots = slots.filter((s) => s.required);
  const optionalSlots = slots.filter((s) => !s.required);

  return {
    preset_id: preset.id,
    generated_at: new Date().toISOString(),
    total_slots: slots.length,
    required_slots: requiredSlots.length,
    slots,
  };
}

export function buildHighConvertingFlow(): RelationshipFlow {
  return buildRelationshipFlow(HIGH_CONVERTING_PRESET);
}

export function buildFashionFlow(): RelationshipFlow {
  return buildRelationshipFlow(FASHION_PRESET);
}

export function buildMinimalModernFlow(): RelationshipFlow {
  return buildRelationshipFlow(MINIMAL_MODERN_PRESET);
}

export function buildAllRelationshipFlows(): RelationshipFlow[] {
  return [
    buildHighConvertingFlow(),
    buildFashionFlow(),
    buildMinimalModernFlow(),
  ];
}
