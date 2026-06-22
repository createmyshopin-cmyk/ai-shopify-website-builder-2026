import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildBlueprintManifestFromPath } from "./build-manifest.js";
import { loadBlueprintFromManifest, loadBlueprintManifest } from "./load-manifest.js";
import { ThemeBlueprintManifestSchema } from "./manifest-types.js";
import { ThemeBlueprintSchema } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const baseThemePath = path.join(repoRoot, "base theme");
const manifestPath = path.join(repoRoot, "docs", "theme-blueprint-manifest.json");

describe("buildBlueprintManifestFromPath", () => {
  it("builds validated manifest from base theme folder", async () => {
    const manifest = await buildBlueprintManifestFromPath(baseThemePath);

    expect(() => ThemeBlueprintManifestSchema.parse(manifest)).not.toThrow();
    expect(() => ThemeBlueprintSchema.parse(manifest.blueprint)).not.toThrow();
    expect(manifest.meta.themeName).toBe("Horizon Pro");
    expect(manifest.meta.sectionCount).toBeGreaterThanOrEqual(160);
    expect(manifest.llmMapPath).toBe("docs/theme-llm-map.json");
  });

  it("loads committed manifest file when present", () => {
    const manifest = loadBlueprintManifest(manifestPath);

    expect(manifest.meta.themeName).toBe("Horizon Pro");
    expect(manifest.blueprint.sections.some((s) => s.type === "editorial-hero")).toBe(
      true,
    );
  });

  it("loadBlueprintFromManifest returns blueprint slice only", () => {
    const blueprint = loadBlueprintFromManifest(manifestPath);

    expect(blueprint.sections.length).toBeGreaterThan(0);
    expect(blueprint.templateSectionOrder?.length).toBeGreaterThan(0);
  });
});
