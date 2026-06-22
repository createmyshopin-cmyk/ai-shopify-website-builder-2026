import { describe, expect, it } from "vitest";

import { GOLDEN_AGENT_OUTPUTS } from "../agents/fixtures.js";
import { buildBlueprintFromLocalTheme, resolveBaseThemePath } from "../blueprint/local-theme-reader.js";
import {
  applyPreviewPatch,
  buildPreviewStateFromOutputs,
} from "../preview/preview-state.js";
import { ADVERSARIAL_CHAT_PROMPTS } from "./adversarial-fixtures.js";
import { parseChatIntentMock, resolveChatIntent } from "./chat-intent.js";
import {
  assertPatchesSafe,
  sanitizeChatMessage,
  sanitizePatchSettings,
} from "./sanitize.js";

const baseTheme = resolveBaseThemePath();
const blueprint = await buildBlueprintFromLocalTheme(baseTheme);
const layout = {
  ...GOLDEN_AGENT_OUTPUTS.layout!,
  sectionOrder: GOLDEN_AGENT_OUTPUTS.layout!.sectionOrder.filter((type) =>
    blueprint.sections.some((section) => section.type === type),
  ),
};
const state = buildPreviewStateFromOutputs(
  "00000000-0000-4000-8000-000000000008",
  blueprint,
  { ...GOLDEN_AGENT_OUTPUTS, layout },
);

describe("sanitizeChatMessage", () => {
  it("rejects liquid and path injection", () => {
    expect(sanitizeChatMessage("{% assign x = 1 %}").ok).toBe(false);
    expect(sanitizeChatMessage("sections/evil.liquid").ok).toBe(false);
    expect(sanitizeChatMessage("<script>x</script>").ok).toBe(false);
  });

  it("accepts normal merchant prompts", () => {
    const result = sanitizeChatMessage("Change colors to black");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe("Change colors to black");
    }
  });
});

describe("parseChatIntentMock", () => {
  it("maps change colors to black", () => {
    const result = parseChatIntentMock({
      message: "Change colors to black",
      state,
      blueprint,
    });
    expect(result.patches).toHaveLength(1);
    expect(result.patches[0]?.op).toBe("updateTheme");
  });

  it("maps add FAQ section", () => {
    const result = parseChatIntentMock({
      message: "Add FAQ section",
      state,
      blueprint,
    });
    expect(result.patches.some((patch) => patch.op === "addSection")).toBe(true);
  });

  it("maps headline edit on hero", () => {
    const result = parseChatIntentMock({
      message: "Change the headline to Summer Launch",
      state,
      blueprint,
    });
    const patch = result.patches.find((entry) => entry.op === "updateSection");
    expect(patch).toBeDefined();
    if (patch?.op === "updateSection") {
      expect(patch.settings.heading).toBe("Summer Launch");
    }
  });
});

describe("adversarial chat prompts", () => {
  it(`covers ${ADVERSARIAL_CHAT_PROMPTS.length}+ cases`, () => {
    expect(ADVERSARIAL_CHAT_PROMPTS.length).toBeGreaterThanOrEqual(50);
  });

  for (const fixture of ADVERSARIAL_CHAT_PROMPTS) {
    it(`handles ${fixture.id}: ${fixture.input.slice(0, 40)}`, () => {
      const sanitized = sanitizeChatMessage(fixture.input);

      if (fixture.expectReject) {
        expect(sanitized.ok).toBe(false);
        return;
      }

      if (!sanitized.ok) {
        return;
      }

      const intent = parseChatIntentMock({
        message: sanitized.message,
        state,
        blueprint,
      });

      assertPatchesSafe(
        intent.patches as Array<{ op: string; settings?: Record<string, unknown> }>,
      );

      for (const patch of intent.patches) {
        const serialized = JSON.stringify(patch);
        expect(serialized).not.toMatch(/\{%|\{\{|\.liquid|sections\//i);
      }

      let next = state;
      for (const patch of intent.patches) {
        next = applyPreviewPatch(next, patch, blueprint);
      }
      expect(next.projectId).toBe(state.projectId);
    });
  }
});

describe("sanitizePatchSettings", () => {
  it("strips script-like values", () => {
    const safe = sanitizePatchSettings({
      heading: "<script>alert(1)</script>",
      valid: "Plain headline",
    });
    expect(safe.heading).toBeUndefined();
    expect(safe.valid).toBe("Plain headline");
  });
});

describe("resolveChatIntent mock fallback", () => {
  it("uses mock parser when useMock is true", async () => {
    const result = await resolveChatIntent(
      { message: "Change colors to black", state, blueprint },
      { useMock: true },
    );
    expect(result.patches.length).toBeGreaterThan(0);
  });
});
