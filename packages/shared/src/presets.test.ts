import { describe, expect, it } from "vitest";

import {
  STYLE_PRESETS,
  getAiKeyForPreset,
  isStylePresetId,
} from "./presets.js";

describe("style presets", () => {
  it("exposes three canonical presets aligned with UI", () => {
    expect(STYLE_PRESETS.map((p) => p.id)).toEqual([
      "high-converting",
      "fashion",
      "minimal-modern",
    ]);
  });

  it("maps UI preset ids to AI keys", () => {
    expect(getAiKeyForPreset("fashion")).toBe("fashion");
    expect(getAiKeyForPreset("minimal-modern")).toBe("minimal");
    expect(getAiKeyForPreset("high-converting")).toBe("high-converting");
  });

  it("rejects unknown preset ids", () => {
    expect(isStylePresetId("dropshipping")).toBe(false);
  });
});
