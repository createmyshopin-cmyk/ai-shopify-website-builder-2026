import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import type { PresetCatalog, SectionCatalog, AllDesignTokens } from "@theme-editor/shared";

import { CompilerError, type CompilerErrorCode, type CompilerErrorDetail } from "./compiler-errors.js";

// ─── ThemeCompilerValidatorService ────────────────────────────────────────────
// Pre-compilation INPUT guard. Runs BEFORE index.json assembly begins.
// Validates preset + section catalog data against Base Theme truth.
// Compiler stops immediately (CompilerError thrown) if any error-severity check fails.
//
// 10 checks:
//   1.  validateSectionHandles()      — handles ∈ section-index (base-theme-truth)
//   2.  validateSettingIds()          — no invented setting IDs in catalog
//   3.  validateBlockTypes()          — block types ∈ dependency-graph
//   4.  validateTemplateReferences()  — layout values are valid Shopify layouts
//   5.  validateSnippetDependencies() — nested snippet refs are consistent
//   6.  validateAssetDependencies()   — section_path follows "sections/{handle}.liquid"
//   7.  validateTokenRefs()           — all token IDs ∈ loaded AllDesignTokens
//   8.  validatePresetFlow()          — preset flow structural integrity
//   9.  detectCycles()               — no circular snippet dependencies
//  10.  validateShopifyCompatibility() — OS 2.0 schema requirements

export interface ThemeValidationContext {
  preset: PresetCatalog;
  sectionCatalogs: SectionCatalog[];
  allTokens: AllDesignTokens;
}

// ─── Raw catalog shapes (minimal — only the fields we need) ───────────────────

interface SectionIndexEntry { section_type: string }
interface SectionIndexFile { sections: SectionIndexEntry[] }

interface SnippetEntry { filename: string; nested_snippets: string[] }
interface SnippetIndexFile { snippets: SnippetEntry[] }

interface TemplateEntry { key: string; layout: string }
interface TemplateIndexFile { templates: TemplateEntry[] }

interface DependencyGraphFile {
  section_to_blocks: Record<string, string[]>;
}

// ─── INVENTED ID PATTERNS ─────────────────────────────────────────────────────
// These patterns match token IDs that were in the old (wrong) builders.
// Any match is an immediate error — these must never enter compilation.
const INVENTED_ID_PATTERNS: RegExp[] = [
  /^color_primary_\d/,      // color_primary_01
  /^color_background_\d/,   // color_background_01
  /^color_accent_\d/,       // color_accent_01
  /^font_heading_/,         // font_heading_modern
  /^font_body_/,            // font_body_clean
  /^font_accent_/,          // font_accent_serif
  /^type_scale_/,           // type_scale_h1
  /^btn_primary_/,          // btn_primary_bg, btn_primary_radius
  /^radius_md$|^radius_sm$|^radius_none$/, // radius_md, radius_sm, radius_none
  /^shadow_card$|^shadow_medium$/, // shadow_card, shadow_medium
  /^space_\d{2}$/,          // space_08, space_04, space_20
  /^anim_/,                 // anim_duration_fast, anim_reveal_fade
];

// ─── SERVICE ──────────────────────────────────────────────────────────────────

@Injectable()
export class ThemeCompilerValidatorService implements OnModuleInit {
  private readonly logger = new Logger(ThemeCompilerValidatorService.name);

  // ── OnModuleInit: fail fast at NestJS startup if any catalog file is missing ─
  async onModuleInit(): Promise<void> {
    this.logger.log("[ThemeCompilerValidator] Startup initialization...");
    await this.ensureInitialized();
  }

  private truthSectionHandles: Set<string> | null = null;
  private truthSectionBlockTypes: Map<string, Set<string>> | null = null;
  private truthSnippetFilenames: Set<string> | null = null;
  private truthSnippetGraph: Map<string, string[]> | null = null;
  private truthTemplateLayouts: Map<string, string> | null = null;
  private initialized = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private resolveCatalogsDir(): string {
    if (process.env["INTELLIGENCE_CATALOGS_DIR"]) {
      return process.env["INTELLIGENCE_CATALOGS_DIR"];
    }
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(__dirname, "../../../shared/src/intelligence/catalogs");
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const dir = this.resolveCatalogsDir();
    this.logger.log("[ThemeCompilerValidator] Loading truth indexes...");

    const [sectionIdx, snippetIdx, templateIdx, depGraph] = await Promise.all([
      this.loadJson<SectionIndexFile>(path.join(dir, "section-index.json")),
      this.loadJson<SnippetIndexFile>(path.join(dir, "snippets", "snippet-index.json")),
      this.loadJson<TemplateIndexFile>(path.join(dir, "templates", "template-index.json")),
      this.loadJson<DependencyGraphFile>(path.join(dir, "dependency-graph.json")),
    ]);

    this.truthSectionHandles = new Set(sectionIdx.sections.map((s) => s.section_type));

    this.truthSectionBlockTypes = new Map(
      Object.entries(depGraph.section_to_blocks).map(([section, blocks]) => [
        section,
        new Set(blocks),
      ]),
    );

    this.truthSnippetFilenames = new Set(snippetIdx.snippets.map((s) => s.filename));
    this.truthSnippetGraph = new Map(
      snippetIdx.snippets.map((s) => [s.filename, s.nested_snippets]),
    );

    this.truthTemplateLayouts = new Map(
      templateIdx.templates.map((t) => [t.key, t.layout]),
    );

    this.initialized = true;
    this.logger.log(
      `[ThemeCompilerValidator] Ready — ` +
      `${this.truthSectionHandles.size} handles, ` +
      `${this.truthSnippetFilenames.size} snippets, ` +
      `${this.truthTemplateLayouts.size} templates`,
    );
  }

  // ── Public entry point ────────────────────────────────────────────────────

  async validateInputs(ctx: ThemeValidationContext): Promise<void> {
    await this.ensureInitialized();

    const issues: CompilerErrorDetail[] = [
      ...this.validateSectionHandles(ctx),
      ...this.validateSettingIds(ctx),
      ...this.validateBlockTypes(ctx),
      ...this.validateTemplateReferences(ctx),
      ...this.validateSnippetDependencies(ctx),
      ...this.validateAssetDependencies(ctx),
      ...this.validateTokenRefs(ctx),
      ...this.validatePresetFlow(ctx),
      ...this.detectCycles(ctx),
      ...this.validateShopifyCompatibility(ctx),
    ];

    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");

    if (warnings.length > 0) {
      this.logger.warn(
        `[ThemeCompilerValidator] ${warnings.length} warning(s): ` +
        warnings.map((w) => `[${w.code}] ${w.message}`).join("; "),
      );
    }

    if (errors.length > 0) {
      this.logger.error(
        `[ThemeCompilerValidator] ${errors.length} error(s) — stopping compilation`,
      );
      throw new CompilerError(issues);
    }

    this.logger.log(
      `[ThemeCompilerValidator] All checks passed for preset "${ctx.preset.id}" ` +
      `(${ctx.sectionCatalogs.length} sections)`,
    );
  }

  // ─── Check 1: Section Handles ─────────────────────────────────────────────
  // Every preferred_section_type in the preset flow must exist in section-index.json,
  // which is generated from base-theme-truth.json. Phantom handles (e.g. "promo-banner",
  // "feature-grid") are caught here before they reach the assembler.
  private validateSectionHandles(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const handles = this.truthSectionHandles!;

    for (const slot of ctx.preset.section_flow) {
      const handle = slot.preferred_section_type;
      if (!handles.has(handle)) {
        issues.push(this.err(
          "INVALID_SECTION_TYPE",
          `Preset "${ctx.preset.id}" slot ${slot.slot}: ` +
          `section handle "${handle}" does not exist in the Base Theme (section-index.json). ` +
          `Check for phantom/renamed handles.`,
        ));
      }
    }

    // Also validate the loaded section catalogs
    for (const catalog of ctx.sectionCatalogs) {
      if (!handles.has(catalog.section_type)) {
        issues.push(this.err(
          "INVALID_SECTION_TYPE",
          `Loaded section catalog "${catalog.section_type}" is not in section-index.json. ` +
          `The catalog may be stale or was generated from incorrect source data.`,
          catalog.section_type,
        ));
      }
    }

    return issues;
  }

  // ─── Check 2: Setting IDs ─────────────────────────────────────────────────
  // Validates that section_settings_raw contains only real Base Theme setting IDs.
  // Catches invented IDs from the old builders (color_primary_01, font_heading_modern, etc.)
  // before they produce incorrect settings in the compiled output.
  private validateSettingIds(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];

    for (const catalog of ctx.sectionCatalogs) {
      for (const setting of catalog.section_settings_raw) {
        const id = setting.id;

        if (!id || typeof id !== "string" || id.trim().length === 0) {
          issues.push(this.err(
            "INVALID_SETTINGS_SCHEMA",
            `Section "${catalog.section_type}": found empty or blank setting ID.`,
            catalog.section_type,
            "section_settings_raw",
          ));
          continue;
        }

        for (const pattern of INVENTED_ID_PATTERNS) {
          if (pattern.test(id)) {
            issues.push(this.err(
              "INVALID_SETTINGS_SCHEMA",
              `Section "${catalog.section_type}": setting ID "${id}" matches an invented token pattern. ` +
              `Replace with the exact Base Theme setting ID from settings_schema.json.`,
              catalog.section_type,
              id,
            ));
            break;
          }
        }
      }
    }

    return issues;
  }

  // ─── Check 3: Block Types ─────────────────────────────────────────────────
  // Block types declared in section_blocks_raw must appear in the dependency
  // graph's section_to_blocks entry for that section. Warns (not errors) to
  // allow for @theme / @app system blocks and internal "_" prefixed blocks.
  private validateBlockTypes(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const ALWAYS_VALID = new Set(["@theme", "@app"]);

    for (const catalog of ctx.sectionCatalogs) {
      const knownBlocks = this.truthSectionBlockTypes!.get(catalog.section_type) ?? new Set<string>();
      if (knownBlocks.size === 0) continue; // section has no known blocks — skip

      for (const block of catalog.section_blocks_raw) {
        const t = block.type;
        if (ALWAYS_VALID.has(t) || t.startsWith("_")) continue;
        if (!knownBlocks.has(t)) {
          issues.push(this.warn(
            "INVALID_BLOCK_SCHEMA",
            `Section "${catalog.section_type}": block type "${t}" is not in ` +
            `dependency-graph.section_to_blocks["${catalog.section_type}"]. ` +
            `Expected: ${[...knownBlocks].join(", ")}.`,
            catalog.section_type,
          ));
        }
      }
    }

    return issues;
  }

  // ─── Check 4: Template References ────────────────────────────────────────
  // All templates in the catalog must use a valid Shopify layout.
  // In Horizon Pro 2.7.0 the only layouts are "theme" and "password".
  private validateTemplateReferences(_ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const VALID_LAYOUTS = new Set(["theme", "password"]);

    for (const [key, layout] of this.truthTemplateLayouts!.entries()) {
      if (!VALID_LAYOUTS.has(layout)) {
        issues.push(this.warn(
          "INVALID_OS20_STRUCTURE",
          `Template "${key}" references layout "${layout}". Only "theme" and "password" ` +
          `are valid Shopify OS 2.0 layouts.`,
        ));
      }
    }

    return issues;
  }

  // ─── Check 5: Snippet Dependencies ───────────────────────────────────────
  // Verifies the internal consistency of the snippet nesting graph:
  // every nested_snippets entry must point to a snippet that exists in the index.
  // Stale entries indicate the snippet catalog needs regeneration.
  private validateSnippetDependencies(_ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const filenames = this.truthSnippetFilenames!;

    for (const [name, nested] of this.truthSnippetGraph!.entries()) {
      for (const dep of nested) {
        if (!filenames.has(dep)) {
          issues.push(this.warn(
            "CATALOG_NOT_FOUND",
            `Snippet "${name}" declares nested dependency "${dep}" which is missing ` +
            `from snippet-index.json. Regenerate catalogs.`,
          ));
        }
      }
    }

    return issues;
  }

  // ─── Check 6: Asset Dependencies ─────────────────────────────────────────
  // All section catalog entries must declare a section_path in the exact
  // Shopify convention: "sections/{handle}.liquid". Any deviation means
  // the catalog was generated with wrong path data.
  private validateAssetDependencies(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];

    for (const catalog of ctx.sectionCatalogs) {
      const expected = `sections/${catalog.section_type}.liquid`;
      if (catalog.section_path !== expected) {
        issues.push(this.warn(
          "INVALID_OS20_STRUCTURE",
          `Section "${catalog.section_type}": section_path is "${catalog.section_path}" ` +
          `but must be "${expected}".`,
          catalog.section_type,
        ));
      }
    }

    return issues;
  }

  // ─── Check 7: Token References ────────────────────────────────────────────
  // ALL token IDs in preset.token_refs must be present as keys in the loaded
  // AllDesignTokens. This is the primary guard against invented token IDs
  // (e.g. color_primary_01 → must be "primary") entering compilation.
  private validateTokenRefs(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const { token_refs, id: presetId } = ctx.preset;
    const { allTokens } = ctx;

    const checkCategory = (
      category: keyof typeof token_refs,
      tokenMap: Record<string, unknown>,
    ): void => {
      for (const tokenId of token_refs[category]) {
        if (!(tokenId in tokenMap)) {
          issues.push(this.err(
            "MISSING_TOKEN_REF",
            `Preset "${presetId}" token_refs.${category}: ` +
            `token ID "${tokenId}" does not exist in the design token catalog. ` +
            `Available IDs: ${Object.keys(tokenMap).join(", ")}`,
          ));
        }
      }
    };

    checkCategory("colors",     allTokens.colors     as Record<string, unknown>);
    checkCategory("typography", allTokens.typography  as Record<string, unknown>);
    checkCategory("spacing",    allTokens.spacing     as Record<string, unknown>);
    checkCategory("radius",     allTokens.radius      as Record<string, unknown>);
    checkCategory("shadows",    allTokens.shadows     as Record<string, unknown>);
    checkCategory("buttons",    allTokens.buttons     as Record<string, unknown>);
    checkCategory("animations", allTokens.animations  as Record<string, unknown>);

    return issues;
  }

  // ─── Check 8: Preset Flow ─────────────────────────────────────────────────
  // Structural validation of the preset section_flow:
  //  • min_sections ≤ max_sections
  //  • Required section count ≥ min_sections
  //  • All slot numbers are unique
  //  • No duplicate preferred_section_type values
  private validatePresetFlow(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const { preset } = ctx;
    const { section_count_rules, section_flow, id: presetId } = preset;

    if (section_count_rules.min_sections > section_count_rules.max_sections) {
      issues.push(this.err(
        "INSUFFICIENT_SECTIONS",
        `Preset "${presetId}": min_sections (${section_count_rules.min_sections}) ` +
        `exceeds max_sections (${section_count_rules.max_sections}).`,
      ));
    }

    const requiredCount = section_flow.filter((s) => s.required).length;
    if (requiredCount < section_count_rules.min_sections) {
      issues.push(this.warn(
        "INSUFFICIENT_SECTIONS",
        `Preset "${presetId}": only ${requiredCount} required slots but ` +
        `min_sections is ${section_count_rules.min_sections}.`,
      ));
    }

    const slotNums = section_flow.map((s) => s.slot);
    if (new Set(slotNums).size !== slotNums.length) {
      issues.push(this.err(
        "DUPLICATE_SECTION_ID",
        `Preset "${presetId}": duplicate slot numbers in section_flow: ${slotNums.join(", ")}`,
      ));
    }

    const sectionTypes = section_flow.map((s) => s.preferred_section_type);
    const dupes = sectionTypes.filter((t, i) => sectionTypes.indexOf(t) !== i);
    if (dupes.length > 0) {
      issues.push(this.warn(
        "DUPLICATE_SECTION_ID",
        `Preset "${presetId}": duplicate preferred_section_type in section_flow: ${[...new Set(dupes)].join(", ")}`,
      ));
    }

    return issues;
  }

  // ─── Check 9: Detect Cycles ───────────────────────────────────────────────
  // DFS cycle detection over the snippet nesting graph.
  // A cycle (A → B → … → A) would cause infinite recursion in Liquid rendering.
  // All cycles are errors — Shopify will fail to render the theme if cycles exist.
  private detectCycles(_ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const graph = this.truthSnippetGraph!;
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (node: string, pathStack: string[]): void => {
      if (inStack.has(node)) {
        issues.push(this.err(
          "INVALID_OS20_STRUCTURE",
          `Circular snippet dependency: ${[...pathStack, node].join(" → ")}. ` +
          `Shopify Liquid will fail to render this snippet chain.`,
        ));
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      inStack.add(node);
      for (const neighbor of graph.get(node) ?? []) {
        dfs(neighbor, [...pathStack, node]);
      }
      inStack.delete(node);
    };

    for (const name of graph.keys()) {
      if (!visited.has(name)) dfs(name, []);
    }

    return issues;
  }

  // ─── Check 10: Shopify OS 2.0 Compatibility ──────────────────────────────
  // Validates that every section in the catalog satisfies Shopify OS 2.0 rules:
  //  • section_path  →  "sections/{handle}.liquid"
  //  • section_schema_name  →  non-empty (the {% schema %} "name" field)
  //  • section_max_blocks  →  null or positive integer
  //  • section_id === section_type (OS 2.0 uses handle as the stable ID)
  private validateShopifyCompatibility(ctx: ThemeValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];

    for (const catalog of ctx.sectionCatalogs) {
      const t = catalog.section_type;

      if (!catalog.section_path.startsWith("sections/") || !catalog.section_path.endsWith(".liquid")) {
        issues.push(this.err(
          "INVALID_OS20_STRUCTURE",
          `Section "${t}": section_path "${catalog.section_path}" does not match ` +
          `the OS 2.0 convention "sections/{handle}.liquid".`,
          t, "section_path",
        ));
      }

      if (!catalog.section_schema_name?.trim()) {
        issues.push(this.err(
          "INVALID_OS20_STRUCTURE",
          `Section "${t}": section_schema_name is empty. ` +
          `It must be the exact "name" value from {% schema %} in the .liquid file.`,
          t, "section_schema_name",
        ));
      }

      if (
        catalog.section_max_blocks !== null &&
        (!Number.isInteger(catalog.section_max_blocks) || catalog.section_max_blocks <= 0)
      ) {
        issues.push(this.err(
          "BLOCK_LIMIT_EXCEEDED",
          `Section "${t}": section_max_blocks is "${catalog.section_max_blocks}" — ` +
          `must be null (unlimited) or a positive integer.`,
          t, "section_max_blocks",
        ));
      }

      if (catalog.section_id !== catalog.section_type) {
        issues.push(this.warn(
          "INVALID_OS20_STRUCTURE",
          `Section "${t}": section_id "${catalog.section_id}" !== section_type "${catalog.section_type}". ` +
          `In OS 2.0 these must be identical.`,
          t,
        ));
      }
    }

    return issues;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private err(code: CompilerErrorCode, message: string, sectionId?: string, field?: string): CompilerErrorDetail {
    return { code, message, severity: "error", sectionId, field };
  }

  private warn(code: CompilerErrorCode, message: string, sectionId?: string): CompilerErrorDetail {
    return { code, message, severity: "warning", sectionId };
  }

  private async loadJson<T>(filePath: string): Promise<T> {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  }
}
