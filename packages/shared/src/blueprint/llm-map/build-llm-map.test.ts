import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildLlmThemeMapFromPath } from "./build-llm-map.js";
import { getLlmPromptContext } from "./get-llm-prompt-context.js";
import { ThemeLlmMapSchema } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../..");
const baseThemePath = path.join(repoRoot, "base theme");

describe("buildLlmThemeMapFromPath", () => {
  it("builds validated ThemeLlmMap from base theme folder", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);

    expect(() => ThemeLlmMapSchema.parse(map)).not.toThrow();
    expect(map.meta.themeName).toBe("Horizon Pro");
    expect(map.meta.themeVersion).toBe("2.7.0");
    expect(map.sections.length).toBeGreaterThanOrEqual(160);
    expect(map.blocks.length).toBeGreaterThanOrEqual(120);
    expect(map.landingPageCatalog.length).toBeGreaterThan(0);
    expect(map.landingPageRecipes.length).toBe(4);
  });

  it("extracts semantic design tokens with current values", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);
    const scheme = map.designTokens.colors.schemes["scheme-1"];

    expect(scheme?.primary).toBe("#2d1b4e");
    expect(scheme?.primary_button_background).toBe("#2d1b4e");
    expect(scheme?.border).toMatch(/^rgba?\(/);
    expect(map.designTokens.typography.fonts.body?.value).toBe("lato_n4");
    expect(map.designTokens.typography.fonts.heading?.value).toBe(
      "playfair_display_n7",
    );
    expect(map.designTokens.buttons.shape).toBe("soft");
    expect(map.designTokens.buttons.globalBorderRadius).toBe(8);
    expect(map.designTokens.radius.global).toBe(8);
  });

  it("maps editorial-hero with typed settings and roles", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);
    const hero = map.sections.find((s) => s.type === "editorial-hero");

    expect(hero).toBeDefined();
    expect(hero?.category).toBe("hero");
    expect(hero?.forgeSlots).toContain("image");

    const heading = hero?.settings.find((s) => s.id === "heading");
    const buttonBg = hero?.settings.find((s) => s.id === "button_bg");
    const minHeight = hero?.settings.find((s) => s.id === "min_height");

    expect(heading?.type).toBe("text");
    expect(heading?.role).toBe("headline");
    expect(buttonBg?.type).toBe("color");
    expect(buttonBg?.role).toBe("button_background");
    expect(minHeight?.type).toBe("range");
    expect(minHeight?.min).toBe(300);
    expect(minHeight?.max).toBe(900);
    expect(minHeight?.role).toBe("size");
  });

  it("landingPageCatalog is a subset of all sections", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);
    const allTypes = new Set(map.sections.map((s) => s.type));

    for (const entry of map.landingPageCatalog) {
      expect(allTypes.has(entry.type)).toBe(true);
    }

    expect(map.landingPageCatalog.length).toBeLessThanOrEqual(
      map.sections.length,
    );
  });

  it("includes reference homepage from index.json", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);

    expect(map.referenceHomepage.order.length).toBeGreaterThan(0);
    expect(
      Object.values(map.referenceHomepage.sections).some(
        (s) => (s as { type?: string }).type === "editorial-hero",
      ),
    ).toBe(true);
  });

  it("getLlmPromptContext returns condensed context for a style preset", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);
    const context = getLlmPromptContext(map, "fashion");

    expect(context.designTokens.colors.activeScheme).toBe("scheme-1");
    expect(context.recipe?.id).toBe("editorial-dtc");
    expect(context.allowedSectionTypes.length).toBeGreaterThan(0);
    expect(context.landingPageCatalog.some((s) => s.type === "editorial-hero")).toBe(
      true,
    );
  });

  it("snapshot: landingPageCatalog section count", async () => {
    const map = await buildLlmThemeMapFromPath(baseThemePath);
    expect(map.landingPageCatalog.length).toMatchInlineSnapshot(`128`);
  });
});
