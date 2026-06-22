import { describe, expect, it } from "vitest";

import {
  CompilerOutputSchema,
  LayoutOutputSchema,
  ThemeBlueprintSchema,
  type AgentPipelineInput,
} from "@theme-editor/shared";

import { runValidationAgent } from "./validation.agent.js";

const minimalBlueprint = ThemeBlueprintSchema.parse({
  sourcePath: "/base",
  sections: [
    { type: "editorial-hero", settings: [], blocks: [] },
    { type: "featured-collection", settings: [], blocks: [] },
  ],
  blocks: [],
  fonts: [],
  colors: ["#111111"],
  css_variables: [],
  settings: [],
  spacing_rules: [],
  radius_rules: [],
});

const pipelineInput: AgentPipelineInput = {
  projectId: "test",
  shop: "test.myshopify.com",
  productIds: ["gid://shopify/Product/1"],
  stylePreset: "high-converting",
  blueprint: minimalBlueprint,
};

describe("runValidationAgent", () => {
  it("passes when layout and compiler only use blueprint sections", () => {
    const layout = LayoutOutputSchema.parse({
      sectionOrder: ["editorial-hero", "featured-collection"],
      spacingScale: "balanced",
      hierarchyNotes: "ok",
      heroSectionType: "editorial-hero",
    });

    const compiler = CompilerOutputSchema.parse({
      indexJson: {
        sections: {
          hero: { type: "editorial-hero", settings: {} },
          featured: { type: "featured-collection", settings: {} },
        },
        order: ["hero", "featured"],
      },
      settingsPatch: {},
      cssVariables: {},
    });

    const result = runValidationAgent(pipelineInput, layout, compiler);
    expect(result.passed).toBe(true);
  });

  it("fails when layout references invented section types", () => {
    const layout = LayoutOutputSchema.parse({
      sectionOrder: ["fake-section"],
      spacingScale: "balanced",
      hierarchyNotes: "bad",
      heroSectionType: "fake-section",
    });

    const compiler = CompilerOutputSchema.parse({
      indexJson: { sections: {}, order: [] },
      settingsPatch: {},
      cssVariables: {},
    });

    const result = runValidationAgent(pipelineInput, layout, compiler);
    expect(result.passed).toBe(false);
  });
});
