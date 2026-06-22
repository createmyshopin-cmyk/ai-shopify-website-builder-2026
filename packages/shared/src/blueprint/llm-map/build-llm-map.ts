import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { LocalThemeFiles } from "../local-theme-reader.js";
import { extractSchemaJsonFromLiquid } from "../parse-section-schema.js";

import { extractDesignTokens, extractThemeMeta } from "./extract-design-tokens.js";
import {
  inferPriorityScore,
  inferRecommendedPosition,
  inferRequired,
  inferSectionCategory,
  inferSectionFamily,
  inferSectionPurpose,
  inferSectionRole,
  isLandingPageSection,
} from "./infer-roles.js";
import { buildLandingPageRecipes } from "./landing-recipes.js";
import { parseSettingsList } from "./parse-setting.js";
import {
  ThemeLlmMapSchema,
  type BlockDef,
  type LlmBlock,
  type LlmSection,
  type ShopifyBlockSchemaJson,
  type ShopifySectionSchemaJson,
  type ThemeLlmMap,
} from "./types.js";

const FORGE_SLOT_REGEX = /data-forge-slot-id="([^"]+)"/g;

async function collectForgeSlots(
  themeRoot: string,
  sectionTypes: string[],
): Promise<Map<string, string[]>> {
  const slots = new Map<string, string[]>();
  const sectionsDir = path.join(themeRoot, "sections");

  let files: string[];
  try {
    files = await readdir(sectionsDir);
  } catch {
    return slots;
  }

  const typeSet = new Set(sectionTypes);

  for (const file of files) {
    if (!file.endsWith(".liquid")) {
      continue;
    }
    const type = file.replace(/\.liquid$/, "");
    if (!typeSet.has(type)) {
      continue;
    }

    const content = await readFile(path.join(sectionsDir, file), "utf8");
    const found = [...content.matchAll(FORGE_SLOT_REGEX)].map((m) => m[1]);
    if (found.length > 0) {
      slots.set(type, [...new Set(found)]);
    }
  }

  return slots;
}

function normalizePresetBlocks(
  blocks: unknown,
): Array<{ type: string; settings?: Record<string, unknown> }> | undefined {
  if (!blocks) {
    return undefined;
  }
  if (Array.isArray(blocks)) {
    return blocks.map((b) => ({
      type: String((b as { type?: string }).type ?? "unknown"),
      settings: (b as { settings?: Record<string, unknown> }).settings,
    }));
  }
  if (typeof blocks === "object") {
    return Object.values(blocks as Record<string, { type?: string; settings?: Record<string, unknown> }>).map(
      (b) => ({
        type: String(b.type ?? "unknown"),
        settings: b.settings,
      }),
    );
  }
  return undefined;
}

function mapBlockSchema(block: ShopifyBlockSchemaJson): BlockDef {
  return {
    type: block.type,
    name: block.name,
    settings: parseSettingsList(block.settings),
  };
}

function mapSectionSchema(
  type: string,
  schema: ShopifySectionSchemaJson,
  forgeSlots: string[],
): LlmSection {
  const category = inferSectionCategory(type);
  const name = schema.name;
  const family = inferSectionFamily(type, category);

  return {
    type,
    name,
    category,
    section_id: type,
    section_role: inferSectionRole(category),
    section_family: family,
    priority_score: inferPriorityScore(type, category),
    required: inferRequired(type, family),
    purpose: inferSectionPurpose(type, name, category),
    recommendedPosition: inferRecommendedPosition(category),
    maxBlocks: schema.max_blocks,
    forgeSlots,
    settings: parseSettingsList(schema.settings),
    blocks: (schema.blocks ?? []).map(mapBlockSchema),
    presets: schema.presets
      ?.filter((p) => p.name)
      .map((p) => ({
        name: p.name!,
        settings: p.settings,
        blocks: normalizePresetBlocks(p.blocks),
      })),
  };
}

function mapStandaloneBlock(
  type: string,
  schema: ShopifySectionSchemaJson,
): LlmBlock {
  return {
    type,
    name: schema.name,
    settings: parseSettingsList(schema.settings),
  };
}

export async function buildLlmThemeMap(files: LocalThemeFiles): Promise<ThemeLlmMap> {
  const meta = extractThemeMeta(files.settingsSchema);
  const designTokens = extractDesignTokens(
    files.settingsData,
    files.settingsSchema,
  );

  const sectionTypes = [...files.sectionSchemas.keys()];
  const forgeSlotMap = await collectForgeSlots(files.themeRoot, sectionTypes);

  const sections: LlmSection[] = [];
  for (const [type, rawSchema] of files.sectionSchemas.entries()) {
    const schema = rawSchema as ShopifySectionSchemaJson;
    sections.push(
      mapSectionSchema(type, schema, forgeSlotMap.get(type) ?? []),
    );
  }
  sections.sort((a, b) => a.type.localeCompare(b.type));

  const blocks: LlmBlock[] = [];
  for (const [type, rawSchema] of files.blockSchemas.entries()) {
    blocks.push(mapStandaloneBlock(type, rawSchema as ShopifySectionSchemaJson));
  }
  blocks.sort((a, b) => a.type.localeCompare(b.type));

  const availableTypes = new Set(sections.map((s) => s.type));
  const landingPageCatalog = sections.filter((s) => isLandingPageSection(s.type));

  const landingPageRecipes = buildLandingPageRecipes(availableTypes);

  const map: ThemeLlmMap = {
    meta: {
      themeName: meta.themeName,
      themeVersion: meta.themeVersion,
      generatedAt: new Date().toISOString(),
      sectionCount: sections.length,
      blockCount: blocks.length,
      sourcePath: files.themeRoot,
    },
    designTokens,
    sections,
    blocks,
    landingPageCatalog,
    landingPageRecipes,
    referenceHomepage: {
      sections: files.indexTemplate.sections as Record<string, unknown>,
      order: files.indexTemplate.order,
    },
  };

  return ThemeLlmMapSchema.parse(map);
}

export async function buildLlmThemeMapFromPath(
  themeRoot: string,
): Promise<ThemeLlmMap> {
  const { readLocalTheme } = await import("../local-theme-reader.js");
  const files = await readLocalTheme(themeRoot);
  return buildLlmThemeMap(files);
}

/** Re-export for liquid schema extraction used by tests */
export { extractSchemaJsonFromLiquid };
