import { describe, expect, it } from "vitest";

import {
  GOLDEN_AGENT_OUTPUTS,
  buildBlueprintFromLocalTheme,
  resolveBaseThemePath,
  buildPreviewStateFromOutputs,
  parseChatIntentMock,
  resolveChatIntent,
} from "@theme-editor/shared";

const baseTheme = resolveBaseThemePath();
const blueprint = await buildBlueprintFromLocalTheme(baseTheme);
const layout = {
  ...GOLDEN_AGENT_OUTPUTS.layout,
  sectionOrder: GOLDEN_AGENT_OUTPUTS.layout.sectionOrder.filter((type) =>
    blueprint.sections.some((section) => section.type === type),
  ),
};
const state = buildPreviewStateFromOutputs(
  "00000000-0000-4000-8000-000000000008",
  blueprint,
  { ...GOLDEN_AGENT_OUTPUTS, layout },
);

describe("phase-8 chat intent latency (in-memory)", () => {
  it("mock intent p95 under 50ms for PRD examples", () => {
    const prompts = [
      "Change colors to black",
      "Add FAQ section",
      "Make hero smaller",
      "Change the headline to Launch Day",
    ];

    const durations: number[] = [];

    for (let run = 0; run < 20; run += 1) {
      for (const message of prompts) {
        const start = performance.now();
        parseChatIntentMock({ message, state, blueprint });
        durations.push(performance.now() - start);
      }
    }

    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
    expect(p95).toBeLessThan(50);
  });

  it("resolveChatIntent mock path stays fast", async () => {
    const start = performance.now();
    await resolveChatIntent(
      { message: "Change colors to black", state, blueprint },
      { useMock: true },
    );
    expect(performance.now() - start).toBeLessThan(50);
  });
});
