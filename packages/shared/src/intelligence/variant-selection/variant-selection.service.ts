import type { VariantFamilyCatalog } from "../types/variant-types.js";
import type { PresetFlow, PresetSlot } from "../types/preset-types.js";
import type { SectionFamily } from "../types/index-types.js";

// ─── Variant Selection Service ────────────────────────────────────────────────
// Selects the best section handle within a semantic variant family for a
// given preset. Deterministic — highest preset_score wins. No LLM. No random.

export class VariantSelectionService {
  /**
   * Returns the section_type handle with the highest preset_score for the given
   * family + preset combination.
   *
   * @param family   Semantic family name (e.g. "hero", "products")
   * @param presetId Preset ID (e.g. "high-converting", "fashion")
   * @param catalogs All loaded variant family catalogs
   * @returns Exact Base Theme section handle, or undefined if family not found
   */
  selectSectionForFamily(
    family: SectionFamily | string,
    presetId: string,
    catalogs: VariantFamilyCatalog[],
  ): string | undefined {
    const catalog = catalogs.find((c) => c.family === family);
    if (!catalog || catalog.sections.length === 0) return undefined;

    let bestSection = catalog.sections[0];
    let bestScore = bestSection.preset_scores[presetId as keyof typeof bestSection.preset_scores] ?? 0;

    for (const entry of catalog.sections.slice(1)) {
      const score = entry.preset_scores[presetId as keyof typeof entry.preset_scores] ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestSection = entry;
      }
    }

    return bestSection.section_type;
  }

  /**
   * Selects the best section handle for each slot in a preset flow.
   * Falls back to `preferred_section_type` if the variant catalog has no entry
   * for the slot's family.
   *
   * @returns Map of slot number → section_type handle
   */
  selectForFlow(
    flow: PresetFlow,
    catalogs: VariantFamilyCatalog[],
  ): Map<number, string> {
    const result = new Map<number, string>();

    for (const slot of flow.slots) {
      const selected = this.selectSectionForFamily(slot.section_family, flow.preset_id, catalogs);
      result.set(slot.slot, selected ?? slot.preferred_section_type);
    }

    return result;
  }

  /**
   * Selects section handles for all slots in a section_flow array (from PresetCatalog).
   * Used directly when a full PresetFlow object is not available.
   */
  selectForSlots(
    slots: PresetSlot[],
    presetId: string,
    catalogs: VariantFamilyCatalog[],
  ): Map<number, string> {
    const result = new Map<number, string>();

    for (const slot of slots) {
      const selected = this.selectSectionForFamily(slot.section_family, presetId, catalogs);
      result.set(slot.slot, selected ?? slot.preferred_section_type);
    }

    return result;
  }
}
