import { z } from "zod";

import { ThemeBlueprintSchema } from "./types.js";

export const ThemeBlueprintManifestMetaSchema = z.object({
  themeName: z.string(),
  themeVersion: z.string(),
  generatedAt: z.string(),
  sectionCount: z.number().int(),
  blockCount: z.number(),
  sourcePath: z.string(),
});

export const ThemeBlueprintManifestSchema = z.object({
  meta: ThemeBlueprintManifestMetaSchema,
  blueprint: ThemeBlueprintSchema,
  llmMapPath: z.string(),
});

export type ThemeBlueprintManifest = z.infer<typeof ThemeBlueprintManifestSchema>;

export const DEFAULT_LLM_MAP_PATH = "docs/theme-llm-map.json";
