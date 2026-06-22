import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildBaseThemeCatalog } from "./build-base-theme-catalog.js";
import { buildAllTokenCatalogs } from "./build-token-catalogs.js";
import { buildAllSectionCatalogs } from "./build-section-catalogs.js";
import { ALL_PRESETS } from "./build-preset-catalogs.js";
import { ALL_VARIANT_FAMILIES, buildVariantFamilyIndex } from "./build-variant-catalogs.js";
import { buildAllRelationshipFlows } from "./build-relationship-graph.js";
import {
  buildSectionIndex,
  buildPresetIndex,
  buildVariantIndex,
  buildTokenIndex,
  buildRelationshipIndex,
} from "./build-indexes.js";
import { buildSnippetCatalog } from "./build-snippet-catalog.js";
import { buildBlockCatalog } from "./build-block-catalog.js";
import { buildTemplateCatalog } from "./build-template-catalog.js";
import { buildDependencyGraph } from "./build-dependency-graph.js";
import type { SectionCatalog } from "../types/catalog-types.js";

// ─── Build All Catalogs ───────────────────────────────────────────────────────

export interface BuildAllInput {
  /** Absolute path to the base theme directory */
  baseThemePath: string;
  /** Absolute path to the catalogs output directory */
  outputDir: string;
  /** If true, also write base-theme-truth.json to docs/intelligence/ */
  writeTruthFile?: boolean;
  /** Absolute path for the truth file (defaults to docs/intelligence/ relative to repo root) */
  truthOutputPath?: string;
}

export interface BuildAllResult {
  tokenCount: number;
  sectionCount: number;
  presetCount: number;
  variantCount: number;
  flowCount: number;
  indexCount: number;
  snippetCount: number;
  blockCount: number;
  templateCount: number;
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function buildAll(input: BuildAllInput): Promise<BuildAllResult> {
  const { baseThemePath, outputDir } = input;

  // ── Phase 0: Base Theme Scanner ───────────────────────────────────────────
  console.log("  [Phase 0] Scanning Base Theme...");
  const truth = await buildBaseThemeCatalog(baseThemePath);

  // Optionally write truth file
  if (input.writeTruthFile && input.truthOutputPath) {
    await writeJson(input.truthOutputPath, truth);
    console.log(`  ✓ base-theme-truth.json written (${truth.sections.length} sections)`);
  }

  // Extract color tokens from truth for section catalog derivation
  const schemeSettings = truth.color_schemes["scheme-1"]?.settings ?? {};

  // ── L0: Design Tokens ─────────────────────────────────────────────────────
  console.log("  [Phase 1] Building token catalogs...");
  const tokens = buildAllTokenCatalogs({
    current: truth.settings_data as Record<string, unknown> extends { current: infer C } ? C : Record<string, unknown>,
  } as Parameters<typeof buildAllTokenCatalogs>[0]);

  // Use settings_data.current if wrapped, otherwise flat
  const settingsDataRaw = truth.settings_data as Record<string, unknown>;
  const settingsCurrent = (settingsDataRaw["current"] as Record<string, unknown> | undefined) ?? settingsDataRaw;
  const tokensFromData = buildAllTokenCatalogs({ current: settingsCurrent } as Parameters<typeof buildAllTokenCatalogs>[0]);

  const tokenDir = path.join(outputDir, "design-tokens");
  await writeJson(path.join(tokenDir, "colors.json"),      tokensFromData.colors);
  await writeJson(path.join(tokenDir, "typography.json"),  tokensFromData.typography);
  await writeJson(path.join(tokenDir, "spacing.json"),     tokensFromData.spacing);
  await writeJson(path.join(tokenDir, "radius.json"),      tokensFromData.radius);
  await writeJson(path.join(tokenDir, "shadows.json"),     tokensFromData.shadows);
  await writeJson(path.join(tokenDir, "buttons.json"),     tokensFromData.buttons);
  await writeJson(path.join(tokenDir, "animations.json"),  tokensFromData.animations);

  // ── L2: Section Catalogs ──────────────────────────────────────────────────
  console.log(`  [Phase 2] Building section catalogs (${truth.sections.length} sections)...`);
  const sectionCatalogs: SectionCatalog[] = buildAllSectionCatalogs(
    truth.sections,
    schemeSettings,
  );

  const sectionDir = path.join(outputDir, "sections");
  for (const catalog of sectionCatalogs) {
    await writeJson(path.join(sectionDir, `${catalog.section_id}.json`), catalog);
  }

  // ── L3: Preset Catalogs ───────────────────────────────────────────────────
  console.log("  [Phase 3] Building preset catalogs...");
  const presetDir = path.join(outputDir, "presets");
  for (const preset of ALL_PRESETS) {
    await writeJson(path.join(presetDir, `${preset.id}.json`), preset);
  }

  // ── L4: Variant Catalogs (new family model) ───────────────────────────────
  console.log("  [Phase 4] Building variant catalogs...");
  const variantDir = path.join(outputDir, "variants");
  for (const family of ALL_VARIANT_FAMILIES) {
    await writeJson(path.join(variantDir, `${family.family}-variants.json`), family);
  }
  await writeJson(path.join(variantDir, "variant-family-index.json"), buildVariantFamilyIndex());

  const variantCount = ALL_VARIANT_FAMILIES.reduce((sum, f) => sum + f.sections.length, 0);

  // ── L5: Relationship Flows ────────────────────────────────────────────────
  console.log("  [Phase 5] Building relationship flows...");
  const flows = buildAllRelationshipFlows();
  const relDir = path.join(outputDir, "relationships");
  for (const flow of flows) {
    await writeJson(path.join(relDir, `${flow.preset_id}-flow.json`), flow);
  }

  // ── Snippet / Block / Template Catalogs ───────────────────────────────────
  console.log("  [Phase 6] Building snippet, block, template catalogs...");
  const snippetCatalog  = buildSnippetCatalog(truth);
  const blockCatalog    = buildBlockCatalog(truth);
  const templateCatalog = buildTemplateCatalog(truth);
  const depGraph        = buildDependencyGraph(truth);

  await writeJson(path.join(outputDir, "snippets", "snippet-index.json"), snippetCatalog);
  await writeJson(path.join(outputDir, "blocks",   "block-index.json"),   blockCatalog);
  await writeJson(path.join(outputDir, "templates","template-index.json"),templateCatalog);
  await writeJson(path.join(outputDir, "dependency-graph.json"),           depGraph);

  // ── Indexes ───────────────────────────────────────────────────────────────
  console.log("  [Phase 7] Building indexes...");
  await writeJson(path.join(outputDir, "section-index.json"),      buildSectionIndex(sectionCatalogs));
  await writeJson(path.join(outputDir, "preset-index.json"),       buildPresetIndex());
  await writeJson(path.join(outputDir, "variant-index.json"),      buildVariantIndex(ALL_VARIANT_FAMILIES));
  await writeJson(path.join(outputDir, "token-index.json"),        buildTokenIndex(tokensFromData));
  await writeJson(path.join(outputDir, "relationship-index.json"), buildRelationshipIndex());

  return {
    tokenCount: 7,
    sectionCount: sectionCatalogs.length,
    presetCount: ALL_PRESETS.length,
    variantCount,
    flowCount: flows.length,
    indexCount: 5,
    snippetCount: snippetCatalog.count,
    blockCount: blockCatalog.count,
    templateCount: templateCatalog.count,
  };
}
