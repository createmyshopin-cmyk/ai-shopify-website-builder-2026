import { describe, expect, it } from "vitest";

import { GOLDEN_AGENT_OUTPUTS } from "../agents/fixtures.js";
import {
  CopyOutputSchema,
  ImageOutputSchema,
  LayoutOutputSchema,
  VisionOutputSchema,
} from "../agents/types.js";
import { ThemeBlueprintSchema } from "../blueprint/types.js";
import { compileTheme, toCompilerOutput } from "./compile-theme.js";

const blueprint = ThemeBlueprintSchema.parse({
  sourcePath: "/base",
  sections: [
    { type: "editorial-hero", settings: ["heading"], blocks: [] },
    { type: "featured-product-grid-v2", settings: [], blocks: [] },
    { type: "faq-v2", settings: [], blocks: [] },
    { type: "section", settings: [], blocks: [] },
  ],
  blocks: [],
  fonts: ["playfair_display_n7", "lato_n4"],
  colors: ["#1a1a1a"],
  css_variables: ["--color-primary"],
  settings: ["color_primary"],
  spacing_rules: [],
  radius_rules: [],
  templateSectionOrder: ["editorial-hero", "featured-product-grid-v2", "faq-v2"],
});

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "00000000-0000-4000-8000-000000000001",
    shop: "test.myshopify.com",
    productIds: ["gid://shopify/Product/1"],
    stylePreset: "high-converting",
    blueprint,
    vision: VisionOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.vision),
    copy: CopyOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.copy),
    layout: LayoutOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.layout),
    image: ImageOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.image),
    ...overrides,
  };
}

describe("compileTheme", () => {
  it("produces PRD compiler output shape", () => {
    const compiled = compileTheme(baseInput());
    expect(compiled.indexJson.order.length).toBeGreaterThan(0);
    expect(compiled.settingsData.color_primary).toBeDefined();
    expect(compiled.cssVariables["--color-primary"]).toBeDefined();
    expect(compiled.sections.every((section) => section.type.length > 0)).toBe(
      true,
    );
  });

  it("only includes blueprint section types", () => {
    const compiled = compileTheme(baseInput());
    const allowed = new Set(blueprint.sections.map((section) => section.type));
    for (const section of compiled.sections) {
      expect(allowed.has(section.type)).toBe(true);
    }
  });

  it("drops unknown layout section types", () => {
    const compiled = compileTheme(
      baseInput({
        layout: LayoutOutputSchema.parse({
          ...GOLDEN_AGENT_OUTPUTS.layout,
          sectionOrder: ["editorial-hero", "not-a-real-section", "faq-v2"],
        }),
      }),
    );
    expect(compiled.sections.map((section) => section.type)).toEqual([
      "editorial-hero",
      "faq-v2",
    ]);
  });

  it("handles empty layout order", () => {
    const compiled = compileTheme(
      baseInput({
        layout: {
          ...LayoutOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.layout),
          sectionOrder: [],
        },
      }),
    );
    expect(compiled.indexJson.order).toHaveLength(0);
  });

  it("maps copy fields into section settings", () => {
    const compiled = compileTheme(baseInput());
    const hero = compiled.sections.find(
      (section) => section.type === "editorial-hero",
    );
    expect(hero?.settings.heading).toBe(GOLDEN_AGENT_OUTPUTS.copy?.headline);
    expect(hero?.settings.button_label).toBe(GOLDEN_AGENT_OUTPUTS.copy?.cta);
  });

  it("injects hero image url when present", () => {
    const compiled = compileTheme(baseInput());
    const hero = compiled.sections.find(
      (section) => section.type === "editorial-hero",
    );
    expect(hero?.settings.image).toContain("placehold.co");
  });

  it("handles special characters in copy", () => {
    const compiled = compileTheme(
      baseInput({
        copy: CopyOutputSchema.parse({
          ...GOLDEN_AGENT_OUTPUTS.copy,
          headline: 'Move "Better" & <Stronger>',
        }),
      }),
    );
    const hero = compiled.sections.find(
      (section) => section.type === "editorial-hero",
    );
    expect(hero?.settings.heading).toContain("&");
  });

  it("handles long product titles without breaking JSON", () => {
    const longTitle = "A".repeat(500);
    const compiled = compileTheme(
      baseInput({
        copy: CopyOutputSchema.parse({
          ...GOLDEN_AGENT_OUTPUTS.copy,
          headline: longTitle,
        }),
      }),
    );
    expect(JSON.parse(JSON.stringify(compiled))).toBeTruthy();
    expect(compiled.sections[0]?.settings.heading).toHaveLength(500);
  });

  it("snapshot: deterministic compiler structure", () => {
    const output = toCompilerOutput(compileTheme(baseInput()));
    expect(output).toMatchInlineSnapshot(`
      {
        "cssVariables": {
          "--color-primary": "#1a1a1a",
          "--font-heading": "playfair_display_n7",
        },
        "indexJson": {
          "order": [
            "editorial-hero_0",
            "featured-product-grid-v2_1",
            "faq-v2_2",
            "section_3",
          ],
          "sections": {
            "editorial-hero_0": {
              "settings": {
                "button_label": "Shop the collection",
                "heading": "Move Better. Feel Stronger.",
                "image": "https://placehold.co/1600x900/1a1a1a/f5f5f5?text=Hero",
                "subheading": "Engineered for your hardest workouts.",
              },
              "type": "editorial-hero",
            },
            "faq-v2_2": {
              "settings": {
                "button_label": "Shop the collection",
                "heading": "Move Better. Feel Stronger.",
                "image": "https://placehold.co/1600x900/1a1a1a/f5f5f5?text=Hero",
                "subheading": "Engineered for your hardest workouts.",
              },
              "type": "faq-v2",
            },
            "featured-product-grid-v2_1": {
              "settings": {
                "button_label": "Shop the collection",
                "heading": "Move Better. Feel Stronger.",
                "image": "https://placehold.co/1600x900/1a1a1a/f5f5f5?text=Hero",
                "subheading": "Engineered for your hardest workouts.",
              },
              "type": "featured-product-grid-v2",
            },
            "section_3": {
              "settings": {
                "button_label": "Shop the collection",
                "heading": "Move Better. Feel Stronger.",
                "image": "https://placehold.co/1600x900/1a1a1a/f5f5f5?text=Hero",
                "subheading": "Engineered for your hardest workouts.",
              },
              "type": "section",
            },
          },
        },
        "settingsPatch": {
          "color_primary": "#1a1a1a",
          "type_body_font": "lato_n4",
          "type_header_font": "playfair_display_n7",
        },
      }
    `);
  });
});
