import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  CompilerOutputSchema,
  SectionSelectionService,
  OrderingEngine,
  VariantSelectionService,
  TokenResolver,
  type CompilerInput,
  type CompilerOutput,
  type CopyIntelligence,
} from "@theme-editor/shared";

import { CatalogLoaderService } from "./catalog-loader.service.js";
import { CompilerValidatorService } from "./compiler-validator.service.js";
import { ThemeCompilerValidatorService } from "./theme-compiler-validator.service.js";
import { SectionSettingsGeneratorService } from "./section-settings-generator.service.js";
import { CompilationCacheService } from "./compilation-cache.service.js";
import { assembleIndexJson } from "./index-json-assembler.js";
import { compilerError, MissingSectionCatalogError } from "./compiler-errors.js";
import { ThemeEventsService } from "../events/theme-events.service.js";
import { AssetIntentEngine } from "../intelligence/asset-intent.engine.js";

// ─── ThemeCompilerService ─────────────────────────────────────────────────────
// Fully deterministic 10-step orchestrator. LLMs never control structure.
//
// Pipeline:
//   Step 1  — load preset catalog (ThemeKnowledgeEngine, JSON source)
//   Step 2  — load section catalogs
//   Step 3  — SectionSelectionService (scored, deterministic)
//   Step 4  — OrderingEngine (hard + soft rules)
//   Step 5  — VariantSelectionService → replaces section types in ordered list
//   Step 6  — TokenResolver (real Base Theme setting IDs)
//   Step 6b — ThemeCompilerValidatorService (INPUT guard, 10 checks, STOP on error)
//   Step 7  — SectionSettingsGeneratorService (catalog-backed, no synthetic keys)
//   Step 8  — assembleIndexJson (OS 2.0 index.json)
//   Step 9  — AssetIntentEngine
//   Step 10 — CompilerValidatorService (OUTPUT guard, 12 checks, STOP on error)

@Injectable()
export class ThemeCompilerService {
  private readonly logger = new Logger(ThemeCompilerService.name);
  // PresetFlowEngine is NOT instantiated here — all preset data flows through
  // ThemeKnowledgeEngine (single JSON-backed source of truth). Fix #3.
  private readonly sectionSelectionService = new SectionSelectionService();
  private readonly orderingEngine = new OrderingEngine();
  private readonly variantSelectionService = new VariantSelectionService();

  constructor(
    @Inject(CatalogLoaderService) private readonly catalogLoader: CatalogLoaderService,
    @Inject(ThemeCompilerValidatorService) private readonly inputValidator: ThemeCompilerValidatorService,
    @Inject(CompilerValidatorService) private readonly validator: CompilerValidatorService,
    @Inject(SectionSettingsGeneratorService) private readonly settingsGenerator: SectionSettingsGeneratorService,
    @Inject(CompilationCacheService) private readonly cache: CompilationCacheService,
    @Inject(ThemeEventsService) private readonly events: ThemeEventsService,
    @Inject(AssetIntentEngine) private readonly assetIntentEngine: AssetIntentEngine,
  ) {}

  /**
   * Returns the copy_intelligence block for a given preset.
   * Used by the Copy Agent to inject preset-specific copy style guidance
   * into the LLM system prompt before generating copy content.
   */
  async getPresetCopyIntelligence(presetId: string): Promise<CopyIntelligence | null> {
    try {
      const preset = await this.catalogLoader.knowledgeEngine.loadPreset(presetId);
      return preset.copy_intelligence ?? null;
    } catch {
      return null;
    }
  }

  async compile(input: CompilerInput): Promise<CompilerOutput> {
    const startMs = Date.now();
    const { stylePreset, blueprint, copy, vision, image } = input;
    const engine = this.catalogLoader.knowledgeEngine;
    const projectId = input.projectId ?? "unknown";

    this.logger.log(`[ThemeCompiler] Compiling: preset=${stylePreset} project=${projectId}`);

    // ── Step 1: Load preset catalog (ThemeKnowledgeEngine = catalog JSON files) ─
    let preset;
    try {
      preset = await engine.loadPreset(stylePreset);
    } catch {
      throw compilerError(
        "UNKNOWN_PRESET",
        `Unknown preset: "${stylePreset}". Valid: high-converting, fashion, minimal-modern`,
      );
    }

    // Build catalog-version-aware cache key (Fix #4).
    // getCatalogVersion() reads section-index.json generated_at — changes every
    // time 'npm run generate:intelligence' runs, invalidating stale cache entries.
    // Duck-type check: resolves after shared package is rebuilt with getCatalogVersion().
    const engineWithVersion = engine as unknown as { getCatalogVersion?(): Promise<string> };
    const catalogVersion = typeof engineWithVersion.getCatalogVersion === "function"
      ? await engineWithVersion.getCatalogVersion()
      : "unknown";
    const cacheKey = this.cache.buildKey(projectId, stylePreset, [], catalogVersion);
    const cached = await this.cache.getCompiledOutput(cacheKey);
    if (cached) {
      this.logger.log(`[ThemeCompiler] Cache hit: ${cacheKey}`);
      return cached;
    }

    // ── Emit: preset selected ─────────────────────────────────────────────────
    await this.events.emitPresetSelected(projectId, stylePreset);

    // ── Step 2: Load all section catalogs ─────────────────────────────────────
    const sectionTypes = preset.section_flow.map((s) => s.preferred_section_type);
    const sectionCatalogs = await engine.loadSections(sectionTypes);

    if (sectionCatalogs.length < sectionTypes.length) {
      const missing = sectionTypes.filter(
        (t) => !sectionCatalogs.some((c) => c.section_type === t),
      );
      this.logger.warn(
        `[ThemeCompiler] ${missing.length} section(s) not found in catalog: ${missing.join(", ")}`,
      );
    }

    // ── Step 3: SectionSelectionService — scored, deterministic ──────────────
    let selectedSections;
    try {
      selectedSections = this.sectionSelectionService.selectSections(
        preset,
        sectionCatalogs,
      );
    } catch {
      selectedSections = sectionTypes.map((type, i) => ({
        section_type: type,
        section_id: type,
        section_family: preset.section_flow[i]?.section_family ?? "content",
        priority_score: 80,
        required: preset.section_flow[i]?.required ?? false,
        compatibility_score: 80,
        slot: i + 1,
      }));
    }

    // ── Step 4: OrderingEngine — hard + soft ordering rules ───────────────────
    let orderedSections;
    try {
      orderedSections = this.orderingEngine.orderSections(selectedSections, preset);
    } catch {
      orderedSections = selectedSections.map((s, i) => ({
        ...s,
        final_slot: i + 1,
        ordering_notes: [] as string[],
      }));
    }

    // Emit pre-variant section order for observability
    const preVariantSectionTypes = orderedSections.map((s) => s.section_type);
    await this.events.emitSectionOrdered(projectId, preVariantSectionTypes);

    // ── Step 5: VariantSelectionService — wire best handle per family ─────────
    // FIX #1: variant-selected types NOW replace section types in orderedSections.
    // variantSlotMap key = original preset slot number (s.slot from SelectedSection).
    // This ensures VariantSelectionService intelligence flows into Steps 7, 8, 9.
    const variantFamilies = await engine.loadAllVariantFamilies();
    const variantSlotMap = this.variantSelectionService.selectForSlots(
      preset.section_flow,
      stylePreset,
      variantFamilies,
    );

    // Apply variant selections to ordered sections
    const variantOrderedSections = orderedSections.map((s) => {
      const variantType = s.slot !== undefined ? variantSlotMap.get(s.slot) : undefined;
      return variantType ? { ...s, section_type: variantType } : s;
    });
    const variantOrderedSectionTypes = variantOrderedSections.map((s) => s.section_type);

    // Emit variant selections (slot → section_type handle)
    const variantSelections: Record<string, string> = {};
    for (const [slot, sectionType] of variantSlotMap) {
      variantSelections[`slot_${slot}`] = sectionType;
    }
    await this.events.emitVariantSelected(projectId, variantSelections);

    // Load any additional section catalogs for variant-selected types not already loaded.
    // This handles cases where VariantSelectionService selects a different handle
    // than the preferred_section_type (e.g. hero-split instead of editorial-hero).
    const loadedTypes = new Set(sectionCatalogs.map((c) => c.section_type));
    const newVariantTypes = variantOrderedSectionTypes.filter((t) => !loadedTypes.has(t));
    if (newVariantTypes.length > 0) {
      const additional = await engine.loadSections(newVariantTypes);
      sectionCatalogs.push(...additional);
      this.logger.log(
        `[ThemeCompiler] Loaded ${additional.length} variant catalog(s): ${additional.map((c) => c.section_type).join(", ")}`,
      );
    }

    // ── Step 6: Resolve design tokens (real Base Theme setting IDs) ───────────
    const allTokens = await engine.loadAllTokens();
    const tokenResolver = TokenResolver.fromTokens(allTokens);
    const resolvedTokenRefs = tokenResolver.resolveRefs(preset.token_refs);

    const flatTokens: Record<string, string> = Object.fromEntries(
      Object.entries(resolvedTokenRefs).map(([k, v]) => [k, String(v)]),
    );

    // Spacing scale using real Base Theme card_gap token
    const spacingScale = preset.characteristics.spacing_scale;
    const baseGap = Number(allTokens.spacing["card_gap"] ?? 20);
    if (spacingScale === "compact") {
      flatTokens["section_padding"] = `${baseGap * 2}px`;
    } else if (spacingScale === "airy") {
      flatTokens["section_padding"] = `${baseGap * 4}px`;
    } else {
      flatTokens["section_padding"] = `${baseGap * 3}px`;
    }

    // ── Step 6b: INPUT GUARD — 10 checks, STOP on any error ──────────────────
    // Validates all preset + section catalog data against Base Theme truth
    // BEFORE a single line of index.json is assembled.
    try {
      await this.inputValidator.validateInputs({
        preset,
        sectionCatalogs,
        allTokens,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.events.emitValidationFailed(projectId, [msg]);
      throw err;
    }

    // ── Step 7: Generate per-section settings (catalog-backed, no synthetic) ──
    // FIX #6: missing catalog → MissingSectionCatalogError (not synthetic fallback).
    // FIX #1: uses variantOrderedSectionTypes (post-variant-selection).
    const settingsMap = new Map<string, Record<string, unknown>>();
    const effectiveSectionTypes = new Set(variantOrderedSectionTypes);

    for (const sectionType of variantOrderedSectionTypes) {
      const sectionCatalog = sectionCatalogs.find((s) => s.section_type === sectionType);

      if (!sectionCatalog) {
        throw new MissingSectionCatalogError(sectionType);
      }

      const settingDefs = sectionCatalog.section_settings_raw.map((s) => ({
        id: s.id,
        type: s.type,
        role: inferSettingRole(s.id, s.type),
        default: undefined,
      }));

      const settings = this.settingsGenerator.generateSettings({
        sectionType,
        settings: settingDefs,
        copy,
        vision,
        image,
        resolvedTokens: flatTokens,
      });

      settingsMap.set(sectionType, settings);
    }

    // ── Step 8: Assemble OS 2.0 index.json ───────────────────────────────────
    // FIX #1: uses variantOrderedSections (not pre-variant orderedSections).
    // blueprint types + all variant-selected types are allowed through.
    const blueprintTypes = new Set(blueprint.sections.map((s) => s.type));
    for (const t of effectiveSectionTypes) blueprintTypes.add(t);

    const orderedForAssembler = variantOrderedSections.map((s, index) => ({
      section_type: s.section_type,
      section_id:   s.section_type,
      section_family: s.section_family,
      priority_score: s.priority_score,
      required: s.required,
      compatibility_score: s.compatibility_score,
      final_slot: index + 1,
      ordering_notes: [] as string[],
    }));

    const { sections, order } = assembleIndexJson(orderedForAssembler, settingsMap);

    // ── Step 9: Generate asset intents ────────────────────────────────────────
    // FIX #1: uses variantOrderedSectionTypes so AssetIntentEngine sees the
    // final variant-resolved section handles.
    const assetIntents = this.assetIntentEngine.generateIntents(
      variantOrderedSectionTypes,
      sectionCatalogs,
      preset,
    );

    // ── Step 10: OUTPUT GUARD — 12 checks, STOP on any error ─────────────────
    const sectionCompatScores = new Map(
      sectionCatalogs.map((s) => [s.section_type, s.compatibility_scores]),
    );
    const sectionBlockLimits = new Map(
      sectionCatalogs
        .filter((s) => s.section_max_blocks !== null)
        .map((s) => [s.section_type, s.section_max_blocks!] as [string, number]),
    );

    // Build variant catalog: section_type → sibling section handles in same family.
    // Enables check6_variantCompatibility to validate _variant settings.
    const variantCatalog: Record<string, string[]> = {};
    for (const family of variantFamilies) {
      const familyHandles = family.sections.map((s) => s.section_type);
      for (const entry of family.sections) {
        variantCatalog[entry.section_type] = familyHandles;
      }
    }

    try {
      this.validator.validate({
        presetId: stylePreset,
        sections: sections as ValidationContext["sections"],
        order,
        blueprintTypes,
        presetSectionOrder: variantOrderedSectionTypes,
        variantCatalog,
        resolvedTokenIds: new Set(Object.keys(flatTokens)),
        sectionCompatibilityScores: sectionCompatScores,
        sectionBlockLimits,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.events.emitValidationFailed(projectId, [msg]);
      throw err;
    }

    // ── Build output with real Base Theme token IDs ───────────────────────────
    const primaryColor = vision.primaryColors[0]
      ?? (allTokens.colors as Record<string, string>)["primary"]
      ?? "#2d1b4e";
    const headingFont = (allTokens.typography as Record<string, string>)["type_heading_font"]
      ?? blueprint.fonts[0]
      ?? "sans-serif";
    const borderRadius = String(
      (allTokens.radius as Record<string, unknown>)["global_border_radius"] ?? 8,
    );

    const output = CompilerOutputSchema.parse({
      indexJson: { sections, order },
      settingsPatch: {
        primary:                     primaryColor,
        type_heading_font:           headingFont,
        type_body_font:              blueprint.fonts[1] ?? headingFont,
        global_border_radius:        Number(borderRadius),
        card_gap:                    baseGap,
        button_shape:                String((allTokens.buttons as Record<string, unknown>)["button_shape"] ?? "soft"),
        primary_button_background:   (allTokens.colors as Record<string, string>)["primary_button_background"] ?? "#2d1b4e",
        primary_button_text:         (allTokens.colors as Record<string, string>)["primary_button_text"] ?? "#ffffff",
      },
      cssVariables: {
        "--color-primary":   primaryColor,
        "--font-heading":    headingFont,
        "--btn-radius":      `${borderRadius}px`,
        "--spacing-section": flatTokens["section_padding"] ?? "60px",
      },
      assetIntents,
    });

    await this.cache.setCompiledOutput(cacheKey, output);

    const durationMs = Date.now() - startMs;
    await this.events.emitThemeCompiled(projectId, stylePreset, durationMs);
    this.logger.log(`[ThemeCompiler] Done: ${order.length} sections in ${durationMs}ms`);

    return output;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferSettingRole(id: string, type: string): string {
  if (type === "image_picker" || type === "image") return "image";
  if (id === "heading" || id.includes("title")) return "headline";
  if (id === "subheading" || id.includes("subtitle") || id.includes("description")) return "subheadline";
  if (id === "button_label" || id.includes("cta") || id.includes("button_text")) return "cta";
  if (id.includes("button_background") || id.includes("btn_bg")) return "button_background";
  if (id.includes("button_text_color")) return "button_text";
  if (id === "color_scheme") return "color_scheme";
  return "setting";
}

// Import type only for validator context (avoid circular)
type ValidationContext = import("./compiler-validator.service.js").ValidationContext;
