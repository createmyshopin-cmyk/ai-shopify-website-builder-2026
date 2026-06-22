import { describe, expect, it } from "vitest";

import {
  applyPreviewPatch,
  buildPreviewStateFromOutputs,
  GOLDEN_AGENT_OUTPUTS,
  ThemeBlueprintSchema,
} from "@theme-editor/shared";

const blueprint = ThemeBlueprintSchema.parse({
  sourcePath: "/base",
  sections: [
    { type: "editorial-hero", settings: ["heading"], blocks: [] },
    { type: "faq-v2", settings: [], blocks: [] },
  ],
  blocks: [],
  fonts: ["playfair_display_n7"],
  colors: ["#1a1a1a"],
  css_variables: ["--color-primary"],
  settings: ["color_primary"],
  spacing_rules: [],
  radius_rules: [],
});

describe("Phase 7 edit latency (in-memory)", () => {
  it("applies section patch under 2ms p95 target (local)", () => {
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000001",
      blueprint,
      GOLDEN_AGENT_OUTPUTS,
    );
    const sectionId = state.order[0]!;
    const samples: number[] = [];

    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      applyPreviewPatch(
        state,
        {
          op: "updateSection",
          sectionId,
          settings: { heading: `Headline ${index}` },
        },
        blueprint,
      );
      samples.push(performance.now() - started);
    }

    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0;
    expect(p95).toBeLessThan(2);
  });
});
