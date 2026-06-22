import { describe, expect, it } from "vitest";

import {
  AgentOutputsSchema,
  GOLDEN_AGENT_OUTPUTS,
  VisionOutputSchema,
} from "../index.js";

describe("GOLDEN_AGENT_OUTPUTS", () => {
  it("matches agent output schemas", () => {
    expect(() => AgentOutputsSchema.parse(GOLDEN_AGENT_OUTPUTS)).not.toThrow();
    expect(() => VisionOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.vision)).not.toThrow();
  });

  it("uses hex colors in vision output", () => {
    for (const color of GOLDEN_AGENT_OUTPUTS.vision!.primaryColors) {
      expect(color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });
});
