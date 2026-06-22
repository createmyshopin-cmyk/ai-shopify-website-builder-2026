import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SectionCatalog } from "../types/catalog-types.js";
import type { PresetCatalog } from "../types/preset-types.js";
import type { AllDesignTokens, ResolvedTokens, TokenRefs } from "../types/token-types.js";
import type { RelationshipFlow } from "../types/intelligence-types.js";
import type { VariantCatalog, VariantFamilyCatalog } from "../types/variant-types.js";
import { SectionCatalogSchema } from "../types/catalog-types.js";
import { PresetCatalogSchema } from "../types/preset-types.js";
import { RelationshipFlowSchema } from "../types/intelligence-types.js";

// ─── ThemeKnowledgeEngine ─────────────────────────────────────────────────────
// Lazy-loading retrieval engine. Only loads catalog files when requested.
// Never loads the entire catalog at once.

export class ThemeKnowledgeEngine {
  private readonly catalogsDir: string;
  private tokenCache: AllDesignTokens | null = null;
  private sectionCache = new Map<string, SectionCatalog>();
  private presetCache = new Map<string, PresetCatalog>();
  private flowCache = new Map<string, RelationshipFlow>();
  private variantFamilyCache = new Map<string, VariantFamilyCatalog>();
  private catalogVersionCache: string | null = null;

  constructor(catalogsDir: string) {
    this.catalogsDir = catalogsDir;
  }

  async loadPreset(presetId: string): Promise<PresetCatalog> {
    if (this.presetCache.has(presetId)) {
      return this.presetCache.get(presetId)!;
    }

    const filePath = path.join(this.catalogsDir, "presets", `${presetId}.json`);
    const raw = JSON.parse(await readFile(filePath, "utf8"));
    const preset = PresetCatalogSchema.parse(raw);
    this.presetCache.set(presetId, preset);
    return preset;
  }

  async loadSection(sectionType: string): Promise<SectionCatalog | null> {
    if (this.sectionCache.has(sectionType)) {
      return this.sectionCache.get(sectionType)!;
    }

    const filePath = path.join(this.catalogsDir, "sections", `${sectionType}.json`);
    try {
      const raw = JSON.parse(await readFile(filePath, "utf8"));
      const section = SectionCatalogSchema.parse(raw);
      this.sectionCache.set(sectionType, section);
      return section;
    } catch {
      return null;
    }
  }

  async loadSections(types: string[]): Promise<SectionCatalog[]> {
    const results = await Promise.all(types.map((t) => this.loadSection(t)));
    return results.filter((s): s is SectionCatalog => s !== null);
  }

  async loadRelationshipFlow(presetId: string): Promise<RelationshipFlow> {
    if (this.flowCache.has(presetId)) {
      return this.flowCache.get(presetId)!;
    }

    const filePath = path.join(this.catalogsDir, "relationships", `${presetId}-flow.json`);
    const raw = JSON.parse(await readFile(filePath, "utf8"));
    const flow = RelationshipFlowSchema.parse(raw);
    this.flowCache.set(presetId, flow);
    return flow;
  }

  async loadAllTokens(): Promise<AllDesignTokens> {
    if (this.tokenCache) return this.tokenCache;

    const [colors, typography, spacing, radius, shadows, buttons, animations] = await Promise.all([
      this.loadTokenFile("colors"),
      this.loadTokenFile("typography"),
      this.loadTokenFile("spacing"),
      this.loadTokenFile("radius"),
      this.loadTokenFile("shadows"),
      this.loadTokenFile("buttons"),
      this.loadTokenFile("animations"),
    ]);

    this.tokenCache = { colors, typography, spacing, radius, shadows, buttons, animations } as AllDesignTokens;
    return this.tokenCache;
  }

  async resolveTokenRefs(refs: TokenRefs): Promise<ResolvedTokens> {
    const allTokens = await this.loadAllTokens();
    const resolved: ResolvedTokens = {
      colors: {},
      typography: {},
      spacing: {},
      radius: {},
      shadows: {},
      buttons: {},
      animations: {},
    };

    for (const tokenId of refs.colors) {
      const val = (allTokens.colors as Record<string, string>)[tokenId];
      if (val) (resolved.colors as Record<string, string>)[tokenId] = val;
    }
    for (const tokenId of refs.typography) {
      const val = (allTokens.typography as Record<string, string>)[tokenId];
      if (val) (resolved.typography as Record<string, string>)[tokenId] = val;
    }
    for (const tokenId of refs.spacing) {
      const val = (allTokens.spacing as Record<string, string>)[tokenId];
      if (val) (resolved.spacing as Record<string, string>)[tokenId] = val;
    }
    for (const tokenId of refs.radius) {
      const val = (allTokens.radius as Record<string, string>)[tokenId];
      if (val) (resolved.radius as Record<string, string>)[tokenId] = val;
    }
    for (const tokenId of refs.shadows) {
      const val = (allTokens.shadows as Record<string, string>)[tokenId];
      if (val) (resolved.shadows as Record<string, string>)[tokenId] = val;
    }
    for (const tokenId of refs.buttons) {
      const val = (allTokens.buttons as Record<string, string>)[tokenId];
      if (val) (resolved.buttons as Record<string, string>)[tokenId] = val;
    }
    for (const tokenId of refs.animations) {
      const val = (allTokens.animations as Record<string, string>)[tokenId];
      if (val) (resolved.animations as Record<string, string>)[tokenId] = val;
    }

    return resolved;
  }

  /**
   * Returns all variant section handles available for the family that contains
   * the given section type, keyed by section_type.
   *
   * e.g. loadVariantCatalogForSection("editorial-hero") returns:
   *   { "editorial-hero": [...], "hero-split": [...], "hero-wave": [...], ... }
   *
   * Used by CompilerValidatorService.check6_variantCompatibility().
   */
  async loadVariantCatalogForSection(sectionType: string): Promise<VariantCatalog> {
    const families = await this.loadAllVariantFamilies();
    for (const family of families) {
      const inFamily = family.sections.some((s) => s.section_type === sectionType);
      if (!inFamily) continue;

      // Map each entry in this family to the legacy SectionVariant format
      const familyVariants = family.sections.map((s) => ({
        variant_id: s.section_type,
        variant_name: s.schema_name,
        variant_type: s.section_type,
        description: `${family.family} variant`,
        layout_hint: family.family,
        recommended_for_presets: Object.entries(s.preset_scores)
          .filter(([, score]) => (score as number) >= 70)
          .map(([preset]) => preset),
        settings_overrides: {} as Record<string, unknown>,
      }));

      // Return a catalog entry for every section in this family
      const catalog: VariantCatalog = {};
      for (const s of family.sections) {
        catalog[s.section_type] = familyVariants;
      }
      return catalog;
    }

    return {};
  }

  /** Load a variant family catalog by semantic family name */
  async loadVariantFamily(family: string): Promise<VariantFamilyCatalog | null> {
    if (this.variantFamilyCache.has(family)) {
      return this.variantFamilyCache.get(family)!;
    }

    const filePath = path.join(this.catalogsDir, "variants", `${family}-variants.json`);
    try {
      const raw = JSON.parse(await readFile(filePath, "utf8")) as VariantFamilyCatalog;
      this.variantFamilyCache.set(family, raw);
      return raw;
    } catch {
      return null;
    }
  }

  /** Load all variant family catalogs */
  async loadAllVariantFamilies(): Promise<VariantFamilyCatalog[]> {
    const families = ["hero", "products", "social_proof", "faq", "trust", "lead_capture", "storytelling", "content"];
    const results = await Promise.all(families.map((f) => this.loadVariantFamily(f)));
    return results.filter((r): r is VariantFamilyCatalog => r !== null);
  }

  /**
   * Returns the `generated_at` timestamp from section-index.json.
   * Used as the catalog version segment in CompilationCacheService.buildKey().
   * After `npm run generate:intelligence`, this value changes — invalidating
   * all previously cached compiled outputs automatically.
   */
  async getCatalogVersion(): Promise<string> {
    if (this.catalogVersionCache) return this.catalogVersionCache;
    try {
      const filePath = path.join(this.catalogsDir, "section-index.json");
      const raw = JSON.parse(await readFile(filePath, "utf8")) as { generated_at?: string };
      this.catalogVersionCache = raw.generated_at ?? "unknown";
    } catch {
      this.catalogVersionCache = "unknown";
    }
    return this.catalogVersionCache;
  }

  clearCache(): void {
    this.tokenCache = null;
    this.sectionCache.clear();
    this.presetCache.clear();
    this.flowCache.clear();
    this.variantFamilyCache.clear();
    this.catalogVersionCache = null;
  }

  private async loadTokenFile(name: string): Promise<Record<string, string>> {
    const filePath = path.join(this.catalogsDir, "design-tokens", `${name}.json`);
    try {
      return JSON.parse(await readFile(filePath, "utf8"));
    } catch {
      return {};
    }
  }
}
