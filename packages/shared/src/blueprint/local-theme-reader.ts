import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildBlueprintFromThemeFiles } from "./build-blueprint.js";
import { extractSchemaJsonFromLiquid } from "./parse-section-schema.js";

export interface LocalThemeFiles {
  themeRoot: string;
  settingsData: Record<string, unknown>;
  settingsSchema: unknown[];
  indexTemplate: {
    sections: Record<string, { type?: string }>;
    order: string[];
  };
  sectionSchemas: Map<string, unknown>;
  blockSchemas: Map<string, unknown>;
  cssVariableNames: string[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function collectLiquidSchemas(
  directory: string,
): Promise<Map<string, unknown>> {
  const schemas = new Map<string, unknown>();

  if (!(await fileExists(directory))) {
    return schemas;
  }

  const files = await readdir(directory);
  for (const file of files) {
    if (!file.endsWith(".liquid")) {
      continue;
    }
    const type = file.replace(/\.liquid$/, "");
    const content = await readFile(path.join(directory, file), "utf8");
    const schema = extractSchemaJsonFromLiquid(content);
    if (schema) {
      schemas.set(type, schema);
    }
  }

  return schemas;
}

function extractCssVariablesFromCss(css: string): string[] {
  const matches = css.matchAll(/--([a-zA-Z0-9-_]+)\s*:/g);
  return [...new Set([...matches].map((m) => `--${m[1]}`))];
}

async function extractCssVariables(themeRoot: string): Promise<string[]> {
  const variables = new Set<string>();
  const candidates = [
    path.join(themeRoot, "assets", "base.css"),
    path.join(themeRoot, "snippets", "theme-styles-variables.liquid"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      const content = await readFile(candidate, "utf8");
      for (const name of extractCssVariablesFromCss(content)) {
        variables.add(name);
      }
    }
  }

  return [...variables];
}

export async function readLocalTheme(
  themeRoot: string,
): Promise<LocalThemeFiles> {
  const resolvedRoot = path.resolve(themeRoot);

  const settingsDataPath = path.join(resolvedRoot, "config", "settings_data.json");
  const settingsSchemaPath = path.join(
    resolvedRoot,
    "config",
    "settings_schema.json",
  );
  const indexPath = path.join(resolvedRoot, "templates", "index.json");

  const settingsDataRaw = await readJsonFile<{
    current?: Record<string, unknown>;
  }>(settingsDataPath);

  const settingsData = settingsDataRaw.current ?? settingsDataRaw;

  const settingsSchema = await readJsonFile<unknown[]>(settingsSchemaPath);
  const indexTemplate = await readJsonFile<{
    sections: Record<string, { type?: string }>;
    order: string[];
  }>(indexPath);

  const sectionSchemas = await collectLiquidSchemas(
    path.join(resolvedRoot, "sections"),
  );
  const blockSchemas = await collectLiquidSchemas(
    path.join(resolvedRoot, "blocks"),
  );
  const cssVariableNames = await extractCssVariables(resolvedRoot);

  return {
    themeRoot: resolvedRoot,
    settingsData: settingsData as Record<string, unknown>,
    settingsSchema,
    indexTemplate,
    sectionSchemas,
    blockSchemas,
    cssVariableNames,
  };
}

export async function buildBlueprintFromLocalTheme(themeRoot: string) {
  const files = await readLocalTheme(themeRoot);
  return buildBlueprintFromThemeFiles(files);
}

export function findRepoRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);

  for (let depth = 0; depth < 8; depth++) {
    const packageJsonPath = path.join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (pkg.workspaces) {
          return current;
        }
      } catch {
        // continue walking up
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return path.resolve(startDir);
}

export function resolveBaseThemePath(
  configuredPath?: string,
  repoRoot?: string,
): string {
  const candidates: string[] = [];

  if (configuredPath) {
    candidates.push(
      path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(process.cwd(), configuredPath),
    );
  }

  const root = repoRoot
    ? path.isAbsolute(repoRoot)
      ? repoRoot
      : path.resolve(process.cwd(), repoRoot)
    : findRepoRoot();

  candidates.push(path.join(root, "base theme"));
  candidates.push(path.resolve(process.cwd(), "../..", "base theme"));

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "config", "settings_data.json"))) {
      return candidate;
    }
  }

  return candidates[0] ?? path.join(root, "base theme");
}
