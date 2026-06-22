import { describe, expect, it } from "vitest";

import {
  CompilerOutputSchema,
  ImageOutputSchema,
  LayoutOutputSchema,
} from "../agents/types.js";
import { ThemeBlueprintSchema } from "../blueprint/types.js";
import {
  MAX_IMAGE_BYTES,
  MAX_MEGAPIXELS,
  runAssetGate,
  runSafetyPipeline,
  runSectionGate,
  runThemeGate,
  validateImageGuardrails,
} from "./safety-pipeline.js";

const blueprint = ThemeBlueprintSchema.parse({
  sourcePath: "/base",
  sections: [{ type: "editorial-hero", settings: [], blocks: [] }],
  blocks: [],
  fonts: ["playfair_display_n7"],
  colors: [],
  css_variables: [],
  settings: [],
  spacing_rules: [],
  radius_rules: [],
});

describe("safety pipeline", () => {
  it("passes golden compiler output against blueprint", () => {
    const compiler = CompilerOutputSchema.parse({
      indexJson: {
        sections: { hero: { type: "editorial-hero", settings: {} } },
        order: ["hero"],
      },
      settingsPatch: { type_header_font: "playfair_display_n7" },
      cssVariables: {},
    });

    const result = runSafetyPipeline({
      blueprint,
      outputs: {
        layout: LayoutOutputSchema.parse({
          sectionOrder: ["editorial-hero"],
          spacingScale: "balanced",
          hierarchyNotes: "ok",
          heroSectionType: "editorial-hero",
        }),
        compiler,
        image: ImageOutputSchema.parse({
          assets: [
            {
              role: "hero",
              prompt: "x",
              altText: "x",
              placeholderUrl: "https://placehold.co/100x100",
            },
          ],
        }),
      },
    });

    expect(result.passed).toBe(true);
    expect(result.gates).toHaveLength(5);
  });

  it("rejects 20MB+ assets", () => {
    const issues = validateImageGuardrails({
      role: "hero",
      url: "https://cdn.example/hero.jpg",
      byteSize: MAX_IMAGE_BYTES + 1,
    });
    expect(issues.some((issue) => issue.code === "ASSET_TOO_LARGE")).toBe(true);
  });

  it("rejects 20MP+ assets", () => {
    const issues = validateImageGuardrails({
      role: "hero",
      url: "https://cdn.example/hero.jpg",
      width: 10_000,
      height: 3_000,
    });
    expect(issues.some((issue) => issue.code === "ASSET_TOO_MANY_PIXELS")).toBe(
      true,
    );
  });

  it("rejects missing asset urls", () => {
    const gate = runAssetGate({
      image: ImageOutputSchema.parse({
        assets: [{ role: "hero", prompt: "x", altText: "x" }],
      }),
    });
    expect(gate.passed).toBe(false);
  });

  it("rejects invented section types via compiler output", () => {
    // Compiler order is the authoritative section source — layout sectionOrder
    // is no longer validated here (single source of truth fix).
    const gate = runSectionGate(
      blueprint,
      CompilerOutputSchema.parse({
        indexJson: {
          sections: { s1: { type: "fake-section", settings: {} } },
          order: ["s1"],
        },
        settingsPatch: {},
        cssVariables: {},
      }),
    );
    expect(gate.passed).toBe(false);
  });

  it("rejects unsupported fonts in compiler settings", () => {
    // Uses the correct Base Theme setting ID: type_heading_font
    const gate = runThemeGate(blueprint, {
      indexJson: { sections: {}, order: [] },
      settingsPatch: { type_heading_font: "Comic Sans MS" },
      cssVariables: {},
    });
    expect(gate.passed).toBe(false);
  });

  it("blocks preview when any gate fails", () => {
    const result = runSafetyPipeline({
      blueprint,
      outputs: {
        layout: LayoutOutputSchema.parse({
          sectionOrder: ["fake"],
          spacingScale: "balanced",
          hierarchyNotes: "bad",
          heroSectionType: "fake",
        }),
        compiler: CompilerOutputSchema.parse({
          indexJson: { sections: {}, order: [] },
          settingsPatch: {},
          cssVariables: {},
        }),
      },
    });
    expect(result.passed).toBe(false);
  });
});

describe("guardrail constants", () => {
  it("uses PRD 20MB and 20MP limits", () => {
    expect(MAX_IMAGE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_MEGAPIXELS).toBe(20_000_000);
  });
});
