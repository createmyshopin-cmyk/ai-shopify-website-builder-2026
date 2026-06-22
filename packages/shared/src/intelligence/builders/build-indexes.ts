import type {
  PresetIndex,
  RelationshipIndex,
  SectionIndex,
  SectionIndexEntry,
  TokenIndex,
  VariantIndex,
  VariantIndexEntry,
} from "../types/index-types.js";
import type { SectionCatalog } from "../types/catalog-types.js";
import type { AllDesignTokens } from "../types/token-types.js";
import type { VariantFamilyCatalog } from "../types/variant-types.js";
import { ALL_PRESETS } from "./build-preset-catalogs.js";

// ─── Index Builders ───────────────────────────────────────────────────────────

export function buildSectionIndex(sections: SectionCatalog[]): SectionIndex {
  const entries: SectionIndexEntry[] = sections.map((s) => ({
    section_id: s.section_id,
    section_type: s.section_type,
    section_category: s.section_category,
    section_role: s.section_role,
    section_family: s.section_family,
    priority_score: s.priority_score,
    required: s.required,
    name: s.name,
    purpose: s.purpose,
  }));

  return {
    generated_at: new Date().toISOString(),
    count: entries.length,
    sections: entries,
  };
}

export function buildPresetIndex(): PresetIndex {
  return {
    generated_at: new Date().toISOString(),
    presets: ALL_PRESETS.map((p) => ({
      preset_id: p.id,
      name: p.name,
      description: p.description,
      min_sections: p.section_count_rules.min_sections,
      max_sections: p.section_count_rules.max_sections,
      focus: p.focus,
    })),
  };
}

export function buildVariantIndex(families: VariantFamilyCatalog[]): VariantIndex {
  const entries: VariantIndexEntry[] = families.flatMap((f) =>
    f.sections.map((s) => ({
      family: f.family,
      section_type: s.section_type,
      schema_name: s.schema_name,
      preset_scores: s.preset_scores,
    })),
  );

  return {
    generated_at: new Date().toISOString(),
    count: entries.length,
    variants: entries,
  };
}

export function buildTokenIndex(tokens: AllDesignTokens): TokenIndex {
  const entries = [
    ...Object.entries(tokens.colors).map(([id, value]) => ({
      token_id: id,
      token_category: "colors" as const,
      value: String(value),
    })),
    ...Object.entries(tokens.typography).map(([id, value]) => ({
      token_id: id,
      token_category: "typography" as const,
      value: String(value),
    })),
    ...Object.entries(tokens.spacing).map(([id, value]) => ({
      token_id: id,
      token_category: "spacing" as const,
      value: String(value),
    })),
    ...Object.entries(tokens.radius).map(([id, value]) => ({
      token_id: id,
      token_category: "radius" as const,
      value: String(value),
    })),
    ...Object.entries(tokens.shadows).map(([id, value]) => ({
      token_id: id,
      token_category: "shadows" as const,
      value: String(value),
    })),
    ...Object.entries(tokens.buttons).map(([id, value]) => ({
      token_id: id,
      token_category: "buttons" as const,
      value: String(value),
    })),
    ...Object.entries(tokens.animations).map(([id, value]) => ({
      token_id: id,
      token_category: "animations" as const,
      value: String(value),
    })),
  ];

  return {
    generated_at: new Date().toISOString(),
    count: entries.length,
    tokens: entries,
  };
}

export function buildRelationshipIndex(): RelationshipIndex {
  return {
    generated_at: new Date().toISOString(),
    flows: [
      { preset_id: "high-converting", slot_count: 10, flow_file: "relationships/high-converting-flow.json" },
      { preset_id: "fashion",         slot_count: 8,  flow_file: "relationships/fashion-flow.json"         },
      { preset_id: "minimal-modern",  slot_count: 6,  flow_file: "relationships/minimal-modern-flow.json"  },
    ],
  };
}
