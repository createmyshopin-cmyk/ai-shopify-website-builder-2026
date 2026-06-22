import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { findRepoRoot } from "./local-theme-reader.js";
import {
  ThemeBlueprintManifestSchema,
  type ThemeBlueprintManifest,
} from "./manifest-types.js";
import type { ThemeBlueprint } from "./types.js";

const DEFAULT_MANIFEST_PATHS = [
  "docs/theme-blueprint-manifest.json",
  path.join("..", "..", "docs", "theme-blueprint-manifest.json"),
];

export function resolveThemeBlueprintManifestPath(
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

  for (const relative of DEFAULT_MANIFEST_PATHS) {
    const candidate = path.join(root, relative);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(root, "docs", "theme-blueprint-manifest.json");
}

export function loadBlueprintManifest(
  filePath?: string,
): ThemeBlueprintManifest {
  const resolved = filePath ?? resolveThemeBlueprintManifestPath();
  const raw = readFileSync(resolved, "utf8");
  return ThemeBlueprintManifestSchema.parse(JSON.parse(raw));
}

export function loadBlueprintFromManifest(
  filePath?: string,
): ThemeBlueprint {
  return loadBlueprintManifest(filePath).blueprint;
}

export function tryLoadBlueprintFromManifest(
  filePath?: string,
): ThemeBlueprint | null {
  try {
    return loadBlueprintFromManifest(filePath);
  } catch {
    return null;
  }
}
