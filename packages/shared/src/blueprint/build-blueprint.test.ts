import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildBlueprintFromLocalTheme } from "./local-theme-reader.js";
import { ThemeBlueprintSchema } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const baseThemePath = path.join(repoRoot, "base theme");

describe("buildBlueprintFromLocalTheme", () => {
  it("builds PRD-shaped blueprint from base theme folder", async () => {
    const blueprint = await buildBlueprintFromLocalTheme(baseThemePath);

    expect(() => ThemeBlueprintSchema.parse(blueprint)).not.toThrow();
    expect(blueprint.sections.length).toBeGreaterThan(0);
    expect(blueprint.themeName).toBe("Horizon Pro");
    expect(blueprint.sections.some((s) => s.type === "editorial-hero")).toBe(
      true,
    );
    expect(blueprint.fonts.length).toBeGreaterThan(0);
    expect(blueprint.colors.length).toBeGreaterThan(0);
    expect(blueprint.templateSectionOrder?.length).toBeGreaterThan(0);
  });

  it("only includes section types that exist in theme files", async () => {
    const blueprint = await buildBlueprintFromLocalTheme(baseThemePath);
    const types = new Set(blueprint.sections.map((s) => s.type));

    expect(types.has("editorial-hero")).toBe(true);
    expect(types.has("fake-invented-section")).toBe(false);
  });
});
