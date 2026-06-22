import type { SectionCatalog } from "../types/catalog-types.js";
import type { PresetCatalog, PresetId } from "../types/preset-types.js";

// ─── Section Selection Service ────────────────────────────────────────────────
// Deterministic section selection — never random.
// Algorithm:
//   1. Start with all required: true sections for the preset
//   2. Filter remaining candidates by compatibility_scores[preset] >= threshold
//   3. Sort by priority_score descending
//   4. Fill optional slots up to max_sections
//   5. Enforce min_sections (throw if not enough qualify)

export interface SelectedSection {
  section_type: string;
  section_id: string;
  section_family: string;
  priority_score: number;
  required: boolean;
  compatibility_score: number;
  slot?: number;
}

export class InsufficientSectionsError extends Error {
  constructor(
    public readonly presetId: string,
    public readonly needed: number,
    public readonly available: number,
  ) {
    super(
      `Preset "${presetId}" requires at least ${needed} sections but only ${available} qualified sections are available.`,
    );
    this.name = "InsufficientSectionsError";
  }
}

export interface SectionSelectionOptions {
  compatibilityThreshold?: number;
}

export class SectionSelectionService {
  selectSections(
    preset: PresetCatalog,
    availableSections: SectionCatalog[],
    options: SectionSelectionOptions = {},
  ): SelectedSection[] {
    const threshold = options.compatibilityThreshold ?? 50;
    const presetId = preset.id as PresetId;
    const { min_sections, max_sections } = preset.section_count_rules;

    // Partition into required and optional candidates
    const requiredByType = new Set(
      preset.section_flow
        .filter((slot) => slot.required)
        .map((slot) => slot.preferred_section_type),
    );

    // Build required selections from preset flow (always included)
    const selected: SelectedSection[] = [];
    const usedTypes = new Set<string>();

    for (const slot of preset.section_flow.filter((s) => s.required)) {
      // Find best matching section for this slot
      const match = availableSections.find(
        (s) =>
          s.section_type === slot.preferred_section_type ||
          s.section_family === slot.section_family,
      );

      const entry: SelectedSection = {
        section_type: slot.preferred_section_type,
        section_id: match?.section_id ?? slot.preferred_section_type,
        section_family: slot.section_family,
        priority_score: match?.priority_score ?? 100,
        required: true,
        compatibility_score: match
          ? this.getCompatibilityScore(match, presetId)
          : 80,
        slot: slot.slot,
      };

      selected.push(entry);
      usedTypes.add(slot.preferred_section_type);
    }

    // Enforce min_sections check
    if (selected.length < min_sections) {
      throw new InsufficientSectionsError(preset.id, min_sections, selected.length);
    }

    // Fill optional slots up to max_sections
    const slotsRemaining = max_sections - selected.length;
    if (slotsRemaining > 0) {
      const optionalSlots = preset.section_flow.filter((s) => !s.required);
      const excludedFamilies = new Set(preset.excluded_section_families);

      const optionalCandidates = optionalSlots
        .filter((slot) => !usedTypes.has(slot.preferred_section_type))
        .map((slot) => {
          const match = availableSections.find(
            (s) => s.section_type === slot.preferred_section_type,
          );
          const score = match
            ? this.getCompatibilityScore(match, presetId)
            : 60;
          return { slot, match, score };
        })
        .filter(({ slot, score }) => {
          if (excludedFamilies.has(slot.section_family)) return false;
          return score >= threshold;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, slotsRemaining);

      for (const { slot, match, score } of optionalCandidates) {
        selected.push({
          section_type: slot.preferred_section_type,
          section_id: match?.section_id ?? slot.preferred_section_type,
          section_family: slot.section_family,
          priority_score: match?.priority_score ?? 60,
          required: false,
          compatibility_score: score,
          slot: slot.slot,
        });
        usedTypes.add(slot.preferred_section_type);
      }
    }

    return selected;
  }

  private getCompatibilityScore(section: SectionCatalog, presetId: PresetId): number {
    switch (presetId) {
      case "high-converting": return section.compatibility_scores.high_converting;
      case "fashion":         return section.compatibility_scores.fashion;
      case "minimal-modern":  return section.compatibility_scores.minimal_modern;
    }
  }
}
