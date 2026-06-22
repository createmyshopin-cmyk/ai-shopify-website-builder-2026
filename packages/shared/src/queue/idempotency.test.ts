import { describe, expect, it } from "vitest";

import {
  pipelineFlowJobId,
  pipelineStepJobId,
  shopifyUploadJobId,
} from "../queue/idempotency.js";

describe("queue idempotency keys", () => {
  it("builds stable upload job ids", () => {
    const first = shopifyUploadJobId("proj-1", "hero-banner");
    const second = shopifyUploadJobId("proj-1", "hero-banner");
    const other = shopifyUploadJobId("proj-1", "logo");

    expect(first).toBe(second);
    expect(first).toBe("upload-proj-1-hero-banner");
    expect(other).not.toBe(first);
  });

  it("builds stable pipeline job ids", () => {
    expect(pipelineFlowJobId("abc")).toBe("pipeline-abc");
    expect(pipelineStepJobId("abc", "VISION")).toBe("abc-VISION");
  });
});
