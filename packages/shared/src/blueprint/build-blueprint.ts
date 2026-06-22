import type { LocalThemeFiles } from "./local-theme-reader.js";
import {
  type SectionSchemaJson,
  ThemeBlueprintSchema,
  type ThemeBlueprint,
} from "./types.js";

function collectThemeMeta(settingsSchema: unknown[]): {
  themeName?: string;
  themeVersion?: string;
} {
  const info = settingsSchema.find(
    (group) =>
      typeof group === "object" &&
      group !== null &&
      "theme_name" in group,
  ) as { theme_name?: string; theme_version?: string } | undefined;

  return {
    themeName: info?.theme_name,
    themeVersion: info?.theme_version,
  };
}

function collectFonts(settingsData: Record<string, unknown>): string[] {
  return Object.entries(settingsData)
    .filter(([key]) => key.startsWith("type_") && key.includes("font"))
    .map(([, value]) => String(value))
    .filter(Boolean);
}

function collectColors(settingsData: Record<string, unknown>): string[] {
  const schemes = settingsData.color_schemes as
    | Record<string, { settings?: Record<string, string> }>
    | undefined;

  if (!schemes) {
    return [];
  }

  const colors = new Set<string>();
  for (const scheme of Object.values(schemes)) {
    for (const value of Object.values(scheme.settings ?? {})) {
      if (typeof value === "string" && value.startsWith("#")) {
        colors.add(value);
      }
    }
  }
  return [...colors];
}

function collectGlobalSettings(settingsSchema: unknown[]): string[] {
  const ids = new Set<string>();

  for (const group of settingsSchema) {
    if (typeof group !== "object" || group === null) {
      continue;
    }
    const settings = (group as { settings?: Array<{ id?: string }> }).settings;
    for (const setting of settings ?? []) {
      if (setting.id) {
        ids.add(setting.id);
      }
    }
  }

  return [...ids];
}

function collectSpacingRules(settingsData: Record<string, unknown>): string[] {
  const keys = Object.keys(settingsData).filter(
    (key) =>
      key.includes("padding") ||
      key.includes("spacing") ||
      key.includes("gap") ||
      key.includes("margin"),
  );
  return keys.map((key) => `${key}=${String(settingsData[key])}`);
}

function collectRadiusRules(settingsData: Record<string, unknown>): string[] {
  const keys = Object.keys(settingsData).filter((key) =>
    key.includes("radius"),
  );
  return keys.map((key) => `${key}=${String(settingsData[key])}`);
}

function mapSectionSchema(
  type: string,
  schema: SectionSchemaJson,
): ThemeBlueprint["sections"][number] {
  return {
    type,
    name: schema.name,
    settings: (schema.settings ?? [])
      .map((s) => s.id)
      .filter((id): id is string => Boolean(id)),
    blocks: (schema.blocks ?? []).map((block) => ({
      type: block.type,
      name: block.name,
      settings: (block.settings ?? [])
        .map((s) => s.id)
        .filter((id): id is string => Boolean(id)),
    })),
  };
}

export function buildBlueprintFromThemeFiles(
  files: LocalThemeFiles,
): ThemeBlueprint {
  const meta = collectThemeMeta(files.settingsSchema);

  const sections: ThemeBlueprint["sections"] = [];
  for (const [type, schema] of files.sectionSchemas.entries()) {
    sections.push(mapSectionSchema(type, schema as SectionSchemaJson));
  }
  sections.sort((a, b) => a.type.localeCompare(b.type));

  const blocks: ThemeBlueprint["blocks"] = [];
  for (const [type, schema] of files.blockSchemas.entries()) {
    const s = schema as SectionSchemaJson;
    blocks.push({
      type,
      name: s.name,
      settings: (s.settings ?? [])
        .map((setting) => setting.id)
        .filter((id): id is string => Boolean(id)),
    });
  }

  const templateSectionOrder = files.indexTemplate.order
    .map((sectionId) => files.indexTemplate.sections[sectionId]?.type)
    .filter((type): type is string => Boolean(type));

  const blueprint: ThemeBlueprint = {
    themeName: meta.themeName,
    themeVersion: meta.themeVersion,
    sourcePath: files.themeRoot,
    sections,
    blocks,
    fonts: collectFonts(files.settingsData),
    colors: collectColors(files.settingsData),
    css_variables: files.cssVariableNames,
    settings: collectGlobalSettings(files.settingsSchema),
    spacing_rules: collectSpacingRules(files.settingsData),
    radius_rules: collectRadiusRules(files.settingsData),
    templateSectionOrder,
  };

  return ThemeBlueprintSchema.parse(blueprint);
}
