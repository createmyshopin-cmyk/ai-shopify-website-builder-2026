import { describe, expect, it } from "vitest";

import {
  PIPELINE_JOB_ORDER,
  PRD_PROGRESS_MESSAGES,
  progressMessageForStep,
} from "../queue/constants.js";

describe("queue constants", () => {
  it("orders pipeline steps per PRD", () => {
    expect(PIPELINE_JOB_ORDER).toEqual([
      "VISION",
      "COPY",
      "IMAGE",
      "LAYOUT",
      "COMPILER",
      "UPLOAD",
      "VALIDATION",
    ]);
  });

  it("maps steps to PRD progress messages", () => {
    expect(progressMessageForStep("VISION")).toBe("Analyzing Product");
    expect(progressMessageForStep("IMAGE")).toBe("Generating Assets");
    expect(progressMessageForStep("UPLOAD")).toBe("Uploading Images");
    expect(progressMessageForStep("VALIDATION")).toBe("Validating");
    expect(PRD_PROGRESS_MESSAGES.PREVIEW_READY).toBe("Preview Ready");
  });
});
