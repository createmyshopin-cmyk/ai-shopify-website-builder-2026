import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

// ─── Base Theme Truth Scanner ─────────────────────────────────────────────────
// Single authoritative scan of the Base Theme (Horizon Pro 2.7.0).
// All subsequent builders derive from this — never from raw theme files directly.

export interface BaseThemeSetting {
  id: string;
  type: string;
  label?: string;
}

export interface BaseThemeBlock {
  type: string;
  settings: Array<{ id: string; type: string }>;
}

export interface BaseThemeSection {
  handle: string;           // exact filename without .liquid
  schema_name: string;      // exact "name" from {% schema %}
  tag: string | null;
  css_class: string | null;
  max_blocks: number | null;
  presets: string[];        // exact preset names from schema
  settings: BaseThemeSetting[];
  blocks: BaseThemeBlock[];
  path: string;             // "sections/editorial-hero.liquid"
}

export interface BaseThemeTemplate {
  filename: string;         // e.g. "index.json"
  key: string;              // e.g. "index"
  sections: string[];       // section handles used in this template
  layout: string;           // "theme" or custom layout
}

export interface ColorScheme {
  settings: Record<string, string>;
}

export interface DependencyGraph {
  section_to_blocks: Record<string, string[]>;
  section_to_snippets: Record<string, string[]>;
  template_to_sections: Record<string, string[]>;
}

export interface BaseThemeTruth {
  meta: {
    themeName: string;
    themeVersion: string;
    scannedAt: string;
  };
  sections: BaseThemeSection[];
  snippets: string[];
  blocks: string[];
  layouts: string[];
  templates: BaseThemeTemplate[];
  settings_schema: unknown[];
  settings_data: Record<string, unknown>;
  color_schemes: Record<string, ColorScheme>;
  assets: string[];
  dependency_graph: DependencyGraph;
}

// ─── Liquid Schema Extractor ──────────────────────────────────────────────────

function extractSchemaJson(liquidContent: string): string | null {
  const start = liquidContent.indexOf("{% schema %}");
  const end = liquidContent.indexOf("{% endschema %}");
  if (start === -1 || end === -1) return null;
  return liquidContent.slice(start + "{% schema %}".length, end).trim();
}

function cleanSchemaJson(raw: string): string {
  // Remove single-line comments (// ...) in JSON — not standard but used in some themes
  let cleaned = raw.replace(/\/\/[^\n]*/g, "");
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  return cleaned;
}

interface RawSchemaJson {
  name?: string;
  tag?: string;
  class?: string;
  max_blocks?: number;
  presets?: Array<{ name?: string }>;
  settings?: Array<{ id?: string; type?: string; label?: string; [k: string]: unknown }>;
  blocks?: Array<{
    type?: string;
    settings?: Array<{ id?: string; type?: string; [k: string]: unknown }>;
    [k: string]: unknown;
  }>;
}

function parseSchemaFromLiquid(liquidContent: string, handle: string): RawSchemaJson {
  const raw = extractSchemaJson(liquidContent);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as RawSchemaJson;
  } catch {
    // Try cleaning the JSON and retry
    const cleaned = cleanSchemaJson(raw);
    try {
      return JSON.parse(cleaned) as RawSchemaJson;
    } catch {
      // Selective field extraction for malformed JSON (e.g., visible_if expressions)
      return extractSchemaFields(raw);
    }
  }
}

function extractSchemaFields(raw: string): RawSchemaJson {
  const result: RawSchemaJson = {};

  // Extract "name" field
  const nameMatch = /["']name["']\s*:\s*["']([^"']+)["']/.exec(raw);
  if (nameMatch) result.name = nameMatch[1];

  // Extract "tag" field
  const tagMatch = /["']tag["']\s*:\s*["']([^"']+)["']/.exec(raw);
  if (tagMatch) result.tag = tagMatch[1];

  // Extract "class" field
  const classMatch = /["']class["']\s*:\s*["']([^"']+)["']/.exec(raw);
  if (classMatch) result.class = classMatch[1];

  // Extract "max_blocks"
  const maxBlocksMatch = /["']max_blocks["']\s*:\s*(\d+)/.exec(raw);
  if (maxBlocksMatch) result.max_blocks = parseInt(maxBlocksMatch[1], 10);

  // Extract preset names
  const presetNames: string[] = [];
  const presetPattern = /["']presets["']\s*:\s*\[([^\]]*)\]/s;
  const presetBlock = presetPattern.exec(raw);
  if (presetBlock) {
    const nameMatches = [...presetBlock[1].matchAll(/["']name["']\s*:\s*["']([^"']+)["']/g)];
    presetNames.push(...nameMatches.map((m) => m[1]));
  }
  result.presets = presetNames.map((n) => ({ name: n }));

  // For settings/blocks, return empty arrays when parsing fails
  result.settings = [];
  result.blocks = [];

  return result;
}

function buildSectionFromSchema(handle: string, schemaJson: RawSchemaJson): BaseThemeSection {
  const settings: BaseThemeSetting[] = (schemaJson.settings ?? [])
    .filter((s): s is { id: string; type: string; label?: string } => !!s.id && !!s.type)
    .map((s) => ({
      id: s.id,
      type: s.type,
      label: typeof s.label === "string" ? s.label : undefined,
    }));

  const blocks: BaseThemeBlock[] = (schemaJson.blocks ?? [])
    .filter((b): b is { type: string; settings?: Array<{ id?: string; type?: string }> } => !!b.type)
    .map((b) => ({
      type: b.type,
      settings: (b.settings ?? [])
        .filter((s): s is { id: string; type: string } => !!s.id && !!s.type)
        .map((s) => ({ id: s.id, type: s.type })),
    }));

  const presets = (schemaJson.presets ?? [])
    .map((p) => p.name ?? "")
    .filter(Boolean);

  return {
    handle,
    schema_name: schemaJson.name ?? handle,
    tag: schemaJson.tag ?? null,
    css_class: schemaJson.class ?? null,
    max_blocks: schemaJson.max_blocks ?? null,
    presets,
    settings,
    blocks,
    path: `sections/${handle}.liquid`,
  };
}

// ─── Directory Scanners ───────────────────────────────────────────────────────

async function listFiles(dir: string, ext?: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    if (!ext) return entries;
    return entries.filter((f) => f.endsWith(ext));
  } catch {
    return [];
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const s = await stat(dirPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export async function buildBaseThemeCatalog(baseThemePath: string): Promise<BaseThemeTruth> {
  const sectionsDir = path.join(baseThemePath, "sections");
  const snippetsDir = path.join(baseThemePath, "snippets");
  const blocksDir   = path.join(baseThemePath, "blocks");
  const layoutsDir  = path.join(baseThemePath, "layout");
  const templatesDir = path.join(baseThemePath, "templates");
  const configDir   = path.join(baseThemePath, "config");
  const assetsDir   = path.join(baseThemePath, "assets");

  // ── Sections ──────────────────────────────────────────────────────────────
  const sectionFiles = await listFiles(sectionsDir, ".liquid");
  const sections: BaseThemeSection[] = [];

  for (const filename of sectionFiles) {
    const handle = filename.replace(/\.liquid$/, "");
    const filePath = path.join(sectionsDir, filename);
    const content = await readFile(filePath, "utf8");
    const schemaJson = parseSchemaFromLiquid(content, handle);
    sections.push(buildSectionFromSchema(handle, schemaJson));
  }

  // ── Snippets ──────────────────────────────────────────────────────────────
  const snippetFiles = await listFiles(snippetsDir, ".liquid");
  const snippets = snippetFiles.map((f) => f.replace(/\.liquid$/, ""));

  // ── Blocks ────────────────────────────────────────────────────────────────
  const blockFiles = (await dirExists(blocksDir))
    ? await listFiles(blocksDir, ".liquid")
    : [];
  const blocks = blockFiles.map((f) => f.replace(/\.liquid$/, ""));

  // ── Layouts ───────────────────────────────────────────────────────────────
  const layoutFiles = await listFiles(layoutsDir, ".liquid");
  const layouts = layoutFiles.map((f) => f.replace(/\.liquid$/, ""));

  // ── Templates ─────────────────────────────────────────────────────────────
  const templateEntries = await readdir(templatesDir);
  const templates: BaseThemeTemplate[] = [];

  for (const entry of templateEntries) {
    if (!entry.endsWith(".json")) continue;
    const templatePath = path.join(templatesDir, entry);
    const key = entry.replace(/\.json$/, "");

    try {
      const raw = await readFile(templatePath, "utf8");
      const parsed = JSON.parse(raw) as {
        sections?: Record<string, { type?: string }>;
        order?: string[];
        layout?: string;
        [k: string]: unknown;
      };

      const usedSections = Object.values(parsed.sections ?? {})
        .map((s) => s.type ?? "")
        .filter(Boolean);

      templates.push({
        filename: entry,
        key,
        sections: [...new Set(usedSections)],
        layout: (parsed.layout as string) ?? "theme",
      });
    } catch {
      templates.push({ filename: entry, key, sections: [], layout: "theme" });
    }
  }

  // ── Config ────────────────────────────────────────────────────────────────
  let settings_schema: unknown[] = [];
  let settings_data_raw: Record<string, unknown> = {};
  let color_schemes: Record<string, ColorScheme> = {};

  try {
    const schemaRaw = await readFile(path.join(configDir, "settings_schema.json"), "utf8");
    settings_schema = JSON.parse(schemaRaw) as unknown[];
  } catch {
    settings_schema = [];
  }

  try {
    const dataRaw = await readFile(path.join(configDir, "settings_data.json"), "utf8");
    const parsedData = JSON.parse(dataRaw) as Record<string, unknown>;
    settings_data_raw = parsedData;

    // Extract current settings (handle both flat and wrapped formats)
    const current = (parsedData["current"] as Record<string, unknown>) ?? parsedData;
    const rawSchemes = current["color_schemes"] as Record<string, { settings: Record<string, string> }> | undefined;

    if (rawSchemes) {
      for (const [schemeKey, scheme] of Object.entries(rawSchemes)) {
        color_schemes[schemeKey] = { settings: scheme.settings ?? {} };
      }
    }
  } catch {
    settings_data_raw = {};
  }

  // ── Assets ────────────────────────────────────────────────────────────────
  const assetFiles = await listFiles(assetsDir);
  const assets = assetFiles;

  // ── Dependency Graph ──────────────────────────────────────────────────────
  const sectionToBlocks: Record<string, string[]> = {};
  const sectionToSnippets: Record<string, string[]> = {};
  const templateToSections: Record<string, string[]> = {};

  // Build from sections
  for (const section of sections) {
    const blockTypes = section.blocks.map((b) => b.type);
    if (blockTypes.length > 0) {
      sectionToBlocks[section.handle] = blockTypes;
    }
  }

  // Read section liquid files to find snippet renders
  for (const filename of sectionFiles) {
    const handle = filename.replace(/\.liquid$/, "");
    const filePath = path.join(sectionsDir, filename);
    const content = await readFile(filePath, "utf8");

    const snippetMatches = [...content.matchAll(/\{%-?\s*render\s+['"]([^'"]+)['"]/g)];
    const usedSnippets = [...new Set(snippetMatches.map((m) => m[1]))];

    if (usedSnippets.length > 0) {
      sectionToSnippets[handle] = usedSnippets;
    }
  }

  // Build template → section map
  for (const template of templates) {
    if (template.sections.length > 0) {
      templateToSections[template.key] = template.sections;
    }
  }

  const dependency_graph: DependencyGraph = {
    section_to_blocks:   sectionToBlocks,
    section_to_snippets: sectionToSnippets,
    template_to_sections: templateToSections,
  };

  // ── Theme version from package.json or .theme-version ─────────────────────
  let themeVersion = "2.7.0";
  try {
    const pkgRaw = await readFile(path.join(baseThemePath, "package.json"), "utf8");
    const pkg = JSON.parse(pkgRaw) as { version?: string; name?: string };
    themeVersion = pkg.version ?? themeVersion;
  } catch {
    // No package.json — use default
  }

  return {
    meta: {
      themeName: "Horizon Pro",
      themeVersion,
      scannedAt: new Date().toISOString(),
    },
    sections,
    snippets,
    blocks,
    layouts,
    templates,
    settings_schema,
    settings_data: settings_data_raw,
    color_schemes,
    assets,
    dependency_graph,
  };
}
