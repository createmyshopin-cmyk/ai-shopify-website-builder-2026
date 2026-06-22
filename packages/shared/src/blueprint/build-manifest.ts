import type { LocalThemeFiles } from "./local-theme-reader.js";
import { buildBlueprintFromThemeFiles } from "./build-blueprint.js";
import {
  DEFAULT_LLM_MAP_PATH,
  ThemeBlueprintManifestSchema,
  type ThemeBlueprintManifest,
} from "./manifest-types.js";
import type { ThemeBlueprint } from "./types.js";

export function buildBlueprintManifestFromBlueprint(
  blueprint: ThemeBlueprint,
  options?: {
    llmMapPath?: string;
    generatedAt?: string;
  },
): ThemeBlueprintManifest {
  const manifest: ThemeBlueprintManifest = {
    meta: {
      themeName: blueprint.themeName ?? "Unknown",
      themeVersion: blueprint.themeVersion ?? "0.0.0",
      generatedAt: options?.generatedAt ?? new Date().toISOString(),
      sectionCount: blueprint.sections.length,
      blockCount: blueprint.blocks.length,
      sourcePath: blueprint.sourcePath,
    },
    blueprint,
    llmMapPath: options?.llmMapPath ?? DEFAULT_LLM_MAP_PATH,
  };

  return ThemeBlueprintManifestSchema.parse(manifest);
}

export function buildBlueprintManifestFromThemeFiles(
  files: LocalThemeFiles,
  options?: {
    llmMapPath?: string;
    generatedAt?: string;
  },
): ThemeBlueprintManifest {
  const blueprint = buildBlueprintFromThemeFiles(files);
  return buildBlueprintManifestFromBlueprint(blueprint, options);
}

export async function buildBlueprintManifestFromPath(
  themeRoot: string,
  options?: {
    llmMapPath?: string;
    generatedAt?: string;
  },
): Promise<ThemeBlueprintManifest> {
  const { readLocalTheme } = await import("./local-theme-reader.js");
  const files = await readLocalTheme(themeRoot);
  return buildBlueprintManifestFromThemeFiles(files, options);
}
