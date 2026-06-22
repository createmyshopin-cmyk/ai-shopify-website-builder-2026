import { Injectable } from "@nestjs/common";

import type { AssetIntent, SectionCatalog } from "@theme-editor/shared";
import type { PresetCatalog } from "@theme-editor/shared";

// ─── AssetIntentEngine ────────────────────────────────────────────────────────
// Reads forge_slots (image setting IDs) from BaseThemeSection data in the
// SectionCatalog, then produces structured AssetIntent[] per section.
// Image style is derived from preset characteristics — never invented.

@Injectable()
export class AssetIntentEngine {
  /**
   * Generates asset intents for all sections in a compiled theme output.
   *
   * @param orderedSectionTypes Exact Base Theme handles in display order
   * @param sectionCatalogs     Loaded SectionCatalog entries (with section_settings_raw)
   * @param preset              The active PresetCatalog (provides image_treatment)
   */
  generateIntents(
    orderedSectionTypes: string[],
    sectionCatalogs: SectionCatalog[],
    preset: PresetCatalog,
  ): AssetIntent[] {
    const catalogMap = new Map(sectionCatalogs.map((c) => [c.section_type, c]));
    const { image_treatment } = preset.characteristics;
    const intents: AssetIntent[] = [];

    for (const sectionType of orderedSectionTypes) {
      const catalog = catalogMap.get(sectionType);
      if (!catalog) continue;

      const imageSlots = this.findImageSlots(catalog);
      for (const slot of imageSlots) {
        intents.push(this.buildIntent(sectionType, slot, preset.id, image_treatment));
      }
    }

    return intents;
  }

  /**
   * Returns exact image setting IDs from the section's raw settings
   * (e.g. "image", "background_image", "image_1" etc.)
   */
  private findImageSlots(catalog: SectionCatalog): string[] {
    return catalog.section_settings_raw
      .filter((s) => s.type === "image_picker" || s.type === "image")
      .map((s) => s.id);
  }

  private buildIntent(
    sectionType: string,
    forgeSlot: string,
    presetId: string,
    imageTreatment: string,
  ): AssetIntent {
    const isHero = sectionType.includes("hero") || sectionType.includes("banner");
    const isProduct = sectionType.includes("product") || sectionType.includes("collection");
    const isEditorial = sectionType.includes("editorial") || sectionType.includes("brand");

    return {
      section_type:     sectionType,
      forge_slot:       forgeSlot,
      image_mood:       this.getMood(presetId, isHero),
      shot_style:       isProduct ? "product-flat-lay" : isHero ? "lifestyle-aspirational" : "editorial-detail",
      lighting_style:   imageTreatment.includes("high-contrast") ? "dramatic-high-contrast" : "natural-soft",
      background_style: isHero ? "full-bleed" : isEditorial ? "editorial-white" : "clean-minimal",
    };
  }

  private getMood(presetId: string, isHero: boolean): string {
    switch (presetId) {
      case "high-converting": return isHero ? "confident-aspirational"  : "clean-trustworthy";
      case "fashion":         return isHero ? "luxury-editorial"         : "aspirational-lifestyle";
      case "minimal-modern":  return isHero ? "clean-confident"          : "minimal-product";
      default:                return "neutral-clean";
    }
  }
}
