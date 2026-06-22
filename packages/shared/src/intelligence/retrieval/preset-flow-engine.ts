import { readFile } from "node:fs/promises";
import path from "node:path";

import { ALL_PRESETS, getPresetById } from "../builders/build-preset-catalogs.js";
import { PresetCatalogSchema } from "../types/preset-types.js";
import type { PresetCatalog, PresetFlow, PresetId } from "../types/preset-types.js";
import type { SectionFamily } from "../types/index-types.js";
import type { TokenRefs } from "../types/token-types.js";

// ─── PresetFlowEngine ─────────────────────────────────────────────────────────
// In-memory preset engine. Deterministic output for all methods.
//
// Single source of truth: catalogs/presets/*.json
// Use PresetFlowEngine.fromCatalogDir(dir) in NestJS / production contexts so
// the engine reads the same JSON files as ThemeKnowledgeEngine.
// The default constructor is kept for non-NestJS contexts (tests, layout.agent)
// and uses ALL_PRESETS as a fallback until fromCatalogDir() is called.

export class PresetFlowEngine {
  private readonly presets: Map<string, PresetCatalog>;

  constructor(presets?: PresetCatalog[]) {
    this.presets = new Map((presets ?? ALL_PRESETS).map((p) => [p.id, p]));
  }

  /**
   * Creates a PresetFlowEngine whose data comes from the catalog JSON files —
   * the single authoritative source (catalogs/presets/*.json).
   * Use this in all NestJS services to keep PresetFlowEngine and
   * ThemeKnowledgeEngine in sync after every catalog regeneration.
   */
  static async fromCatalogDir(catalogsDir: string): Promise<PresetFlowEngine> {
    const presetIds = ["high-converting", "fashion", "minimal-modern"];
    const presets = await Promise.all(
      presetIds.map(async (id) => {
        const filePath = path.join(catalogsDir, "presets", `${id}.json`);
        const raw = JSON.parse(await readFile(filePath, "utf8"));
        return PresetCatalogSchema.parse(raw);
      }),
    );
    return new PresetFlowEngine(presets);
  }

  getFlow(presetId: string): PresetFlow {
    const preset = this.getPreset(presetId);
    const required = preset.section_flow.filter((s) => s.required);
    const optional = preset.section_flow.filter((s) => !s.required);

    return {
      preset_id: preset.id as PresetId,
      slots: preset.section_flow,
      required_count: required.length,
      optional_count: optional.length,
      min_sections: preset.section_count_rules.min_sections,
      max_sections: preset.section_count_rules.max_sections,
    };
  }

  getSectionOrder(presetId: string): string[] {
    const preset = this.getPreset(presetId);
    return preset.section_flow
      .filter((slot) => slot.required)
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => slot.preferred_section_type);
  }

  getFullSectionOrder(presetId: string): string[] {
    const preset = this.getPreset(presetId);
    return preset.section_flow
      .sort((a, b) => a.slot - b.slot)
      .map((slot) => slot.preferred_section_type);
  }

  getVariantForSlot(presetId: string, slot: number): string {
    const preset = this.getPreset(presetId);
    const slotEntry = preset.section_flow.find((s) => s.slot === slot);
    return slotEntry?.preferred_variant ?? "default";
  }

  getPresetTokenRefs(presetId: string): TokenRefs {
    const preset = this.getPreset(presetId);
    return preset.token_refs;
  }

  getExcludedFamilies(presetId: string): SectionFamily[] {
    const preset = this.getPreset(presetId);
    return preset.excluded_section_families;
  }

  getSectionCountRules(presetId: string): { min: number; max: number } {
    const preset = this.getPreset(presetId);
    return {
      min: preset.section_count_rules.min_sections,
      max: preset.section_count_rules.max_sections,
    };
  }

  validateSectionCount(presetId: string, count: number): { valid: boolean; error?: string } {
    const { min, max } = this.getSectionCountRules(presetId);
    if (count < min) {
      return { valid: false, error: `Section count ${count} is below minimum ${min} for preset "${presetId}"` };
    }
    if (count > max) {
      return { valid: false, error: `Section count ${count} exceeds maximum ${max} for preset "${presetId}"` };
    }
    return { valid: true };
  }

  validateAgainstBlueprint(
    presetId: string,
    availableTypes: string[],
  ): { valid: boolean; missing: string[]; warnings: string[] } {
    const preset = this.getPreset(presetId);
    const availableSet = new Set(availableTypes);
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const slot of preset.section_flow) {
      if (slot.required && !availableSet.has(slot.preferred_section_type)) {
        missing.push(slot.preferred_section_type);
      } else if (!slot.required && !availableSet.has(slot.preferred_section_type)) {
        warnings.push(`Optional section "${slot.preferred_section_type}" not available in blueprint`);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  listPresets(): PresetCatalog[] {
    return ALL_PRESETS;
  }

  private getPreset(presetId: string): PresetCatalog {
    const preset = this.presets.get(presetId) ?? getPresetById(presetId);
    if (!preset) {
      throw new Error(`Unknown preset: "${presetId}". Valid presets: ${[...this.presets.keys()].join(", ")}`);
    }
    return preset;
  }
}

// Singleton for use in non-DI contexts
export const presetFlowEngine = new PresetFlowEngine();
