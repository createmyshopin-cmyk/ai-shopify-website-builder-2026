import { describe, expect, it } from "vitest";

import {
  pipelineFlowJobId,
  shopifyUploadJobId,
} from "../../packages/shared/src/queue/idempotency.js";

describe("Phase 4 perf / chaos guards", () => {
  it("duplicate upload retries use the same idempotent key", () => {
    const attempts = Array.from({ length: 3 }, () =>
      shopifyUploadJobId("project-123", "asset-hero"),
    );
    expect(new Set(attempts).size).toBe(1);
  });

  it("duplicate pipeline enqueue uses one flow job id", () => {
    const attempts = Array.from({ length: 5 }, () =>
      pipelineFlowJobId("project-123"),
    );
    expect(new Set(attempts).size).toBe(1);
  });
});
