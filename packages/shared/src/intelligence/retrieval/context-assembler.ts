import type { PresetCatalog } from "../types/preset-types.js";
import type { SectionCatalog } from "../types/catalog-types.js";
import type { ResolvedTokens } from "../types/token-types.js";
import type { RelationshipFlow } from "../types/intelligence-types.js";

// ─── Context Assembler ────────────────────────────────────────────────────────
// Produces compact LLM-ready strings. Replaces getLlmPromptContext().
// Critical: keep token count minimal. Only include what the LLM needs.

export interface ThemePromptContext {
  preset: PresetCatalog;
  sections: SectionCatalog[];
  tokens: ResolvedTokens;
  flow?: RelationshipFlow;
}

export function formatForPrompt(context: ThemePromptContext): string {
  const { preset, sections, tokens, flow } = context;
  const lines: string[] = [];

  // Preset summary (compact)
  lines.push(`=== PRESET: ${preset.name} ===`);
  lines.push(`Focus: ${preset.focus.join(", ")}`);
  lines.push(`Spacing: ${preset.characteristics.spacing_scale} | Animation: ${preset.characteristics.animation_intensity} | Typography: ${preset.characteristics.typography_style}`);
  lines.push(`Sections: min=${preset.section_count_rules.min_sections} max=${preset.section_count_rules.max_sections}`);

  // Section flow (compact ordered list)
  lines.push(`\n=== SECTION ORDER ===`);
  const requiredSlots = preset.section_flow.filter((s) => s.required);
  for (const slot of requiredSlots) {
    lines.push(`${slot.slot}. [${slot.section_family}] ${slot.preferred_section_type} → variant: ${slot.preferred_variant}`);
  }

  // Sections with minimal fields
  if (sections.length > 0) {
    lines.push(`\n=== SECTIONS (${sections.length}) ===`);
    for (const section of sections) {
      lines.push(`- ${section.section_type} (${section.section_family}) | priority:${section.priority_score} | goal:${section.metadata.identity.conversion_goal}`);
      lines.push(`  Layout: ${section.metadata.layout.desktop_layout} | Image: ${section.metadata.image.image_ratio}`);
    }
  }

  // Key tokens only (avoid dumping all)
  lines.push(`\n=== KEY TOKENS ===`);
  const keyColors = [
    tokens.colors.color_primary_01,
    tokens.colors.color_background_01,
    tokens.colors.color_button_primary_bg,
  ].filter(Boolean);
  if (keyColors.length > 0) {
    lines.push(`Colors: primary=${keyColors[0]} bg=${keyColors[1]} cta=${keyColors[2]}`);
  }

  const keyFonts = [tokens.typography.font_heading_modern, tokens.typography.font_body_clean].filter(Boolean);
  if (keyFonts.length > 0) {
    lines.push(`Fonts: heading=${keyFonts[0]} body=${keyFonts[1]}`);
  }

  if (tokens.buttons.btn_primary_bg) {
    lines.push(`Button: bg=${tokens.buttons.btn_primary_bg} text=${tokens.buttons.btn_primary_text} radius=${tokens.buttons.btn_primary_radius}`);
  }

  // Flow rules (if provided)
  if (flow) {
    lines.push(`\n=== CONVERSION SCORES ===`);
    for (const slot of flow.slots) {
      if (slot.conversion_score >= 70) {
        lines.push(`${slot.section_type}: score=${slot.conversion_score} weight=${slot.visual_weight}`);
      }
    }
  }

  return lines.join("\n");
}

export function formatSectionForPrompt(section: SectionCatalog): string {
  const m = section.metadata;
  return [
    `Section: ${section.section_type} (${section.section_family})`,
    `Purpose: ${section.purpose}`,
    `Layout: ${m.layout.desktop_layout} | Content: ${m.layout.content_hierarchy}`,
    `Typography: heading=${m.typography.heading_size} body=${m.typography.body_size}`,
    `Colors: bg=${m.colorSystem.background_color} text=${m.colorSystem.text_color}`,
    `Animation: ${m.animation.reveal_animation} (${m.animation.transition_duration}ms)`,
    `Compatibility: hc=${section.compatibility_scores.high_converting} fa=${section.compatibility_scores.fashion} mm=${section.compatibility_scores.minimal_modern}`,
  ].join("\n");
}
