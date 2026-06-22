import { describe, expect, it } from "vitest";

import { GOLDEN_AGENT_OUTPUTS } from "../agents/fixtures.js";
import { ThemeBlueprintSchema } from "../blueprint/types.js";
import {
  applyPreviewPatch,
  buildPreviewStateFromOutputs,
  getAvailableSectionTypes,
  layoutSectionOrderFromState,
  previewStateToCompilerOutput,
} from "./preview-state.js";

const blueprint = ThemeBlueprintSchema.parse({
  sourcePath: "/base",
  sections: [
    { type: "editorial-hero", settings: ["heading"], blocks: [] },
    { type: "faq-v2", settings: [], blocks: [] },
    { type: "featured-product-grid-v2", settings: [], blocks: [] },
  ],
  blocks: [],
  fonts: ["playfair_display_n7"],
  colors: ["#1a1a1a"],
  css_variables: ["--color-primary"],
  settings: ["color_primary"],
  spacing_rules: [],
  radius_rules: [],
});

describe("preview state", () => {
  it("builds from compiler output", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    expect(state.order.length).toBeGreaterThan(0);
    expect(state.sections.length).toBe(state.order.length);
  });

  it("reorders sections", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    const reversed = [...state.order].reverse();
    const next = applyPreviewPatch(
      state,
      { op: "reorder", order: reversed },
      blueprint,
    );
    expect(next.order).toEqual(reversed);
  });

  it("updates section text settings", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    const sectionId = state.order[0]!;
    const next = applyPreviewPatch(
      state,
      {
        op: "updateSection",
        sectionId,
        settings: { heading: "Edited headline" },
      },
      blueprint,
    );
    const section = next.sections.find((entry) => entry.id === sectionId);
    expect(section?.settings.heading).toBe("Edited headline");
  });

  it("disables section without removing from state", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    const sectionId = state.order[0]!;
    const next = applyPreviewPatch(
      state,
      { op: "toggleSection", sectionId, enabled: false },
      blueprint,
    );
    const compiler = previewStateToCompilerOutput(next);
    expect(compiler.indexJson.order).not.toContain(sectionId);
    expect(next.sections.find((s) => s.id === sectionId)?.enabled).toBe(false);
  });

  it("adds blueprint section type only", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    const next = applyPreviewPatch(
      state,
      { op: "addSection", sectionType: "faq-v2" },
      blueprint,
    );
    expect(next.order.length).toBe(state.order.length + 1);
    expect(layoutSectionOrderFromState(next).includes("faq-v2")).toBe(true);
  });

  it("rejects invented section types", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    expect(() =>
      applyPreviewPatch(
        state,
        { op: "addSection", sectionType: "fake-hero" },
        blueprint,
      ),
    ).toThrow(/blueprint/i);
  });

  it("updates theme color settings", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    const next = applyPreviewPatch(
      state,
      {
        op: "updateTheme",
        settingsPatch: { color_primary: "#000000" },
      },
      blueprint,
    );
    expect(next.settingsPatch.color_primary).toBe("#000000");
    expect(next.cssVariables["--color-primary"]).toBe("#000000");
  });

  it("curates section picker from blueprint", () => {
    const types = getAvailableSectionTypes(blueprint);
    expect(types).toContain("editorial-hero");
    expect(types).toContain("faq-v2");
  });
});
