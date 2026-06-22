import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { findRepoRoot } from "../local-theme-reader.js";

import { pickRecipeForPreset } from "./landing-recipes.js";
import {
  LlmPromptContextSchema,
  ThemeLlmMapSchema,
  type LlmPromptContext,
  type ThemeLlmMap,
} from "./types.js";

const DEFAULT_MAP_PATHS = [
  "docs/theme-llm-map.json",
  path.join("..", "..", "docs", "theme-llm-map.json"),
];

export function resolveThemeLlmMapPath(
  configuredPath?: string,
  repoRoot?: string,
): string {
  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  const root = repoRoot
    ? path.isAbsolute(repoRoot)
      ? repoRoot
      : path.resolve(process.cwd(), repoRoot)
    : findRepoRoot();

  for (const relative of DEFAULT_MAP_PATHS) {
    const candidate = path.join(root, relative);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(root, "docs", "theme-llm-map.json");
}

export function loadLlmThemeMap(filePath?: string): ThemeLlmMap {
  const resolved = filePath ?? resolveThemeLlmMapPath();
  const raw = readFileSync(resolved, "utf8");
  return ThemeLlmMapSchema.parse(JSON.parse(raw));
}

export function getLlmPromptContext(
  map: ThemeLlmMap,
  stylePreset: string,
  options?: {
    sectionTypes?: string[];
    maxCatalogSections?: number;
  },
): LlmPromptContext {
  const recipe = pickRecipeForPreset(map.landingPageRecipes, stylePreset);

  let catalog = map.landingPageCatalog;
  if (options?.sectionTypes?.length) {
    const allowed = new Set(options.sectionTypes);
    catalog = catalog.filter((s) => allowed.has(s.type));
  }

  const maxSections = options?.maxCatalogSections ?? catalog.length;
  catalog = catalog.slice(0, maxSections);

  const condensedCatalog = catalog.map((section) => ({
    type: section.type,
    name: section.name,
    category: section.category,
    purpose: section.purpose,
    recommendedPosition: section.recommendedPosition,
    settings: section.settings.map((s) => ({
      id: s.id,
      type: s.type,
      role: s.role,
      default: s.default,
      label: s.label,
    })),
  }));

  const allowedSectionTypes = catalog.map((s) => s.type);

  return LlmPromptContextSchema.parse({
    designTokens: map.designTokens,
    landingPageCatalog: condensedCatalog,
    recipe,
    allowedSectionTypes,
  });
}

export function formatLlmPromptContextForSystem(
  context: LlmPromptContext,
): string {
  const lines: string[] = [
    "## Theme Design Tokens",
    JSON.stringify(context.designTokens, null, 2),
    "",
    "## Landing Page Recipe",
    context.recipe
      ? `${context.recipe.name}: ${context.recipe.description}\nSuggested order: ${context.recipe.sectionOrder.join(" → ")}`
      : "No recipe matched",
    "",
    "## Available Sections (Horizon Pro)",
    ...context.landingPageCatalog.map(
      (s) =>
        `- **${s.type}** [${s.category}]: ${s.purpose}\n  Settings: ${s.settings.map((setting) => `${setting.id}(${setting.type}/${setting.role})`).join(", ")}`,
    ),
    "",
    `Allowed section types: ${context.allowedSectionTypes.join(", ")}`,
  ];

  return lines.join("\n");
}
