import { describe, expect, it } from "vitest";

import { PRD_RETRY_DELAYS_MS, withRetry } from "../utils/retry.js";

describe("withRetry", () => {
  it("uses PRD backoff delays 5s/10s/20s", () => {
    expect(PRD_RETRY_DELAYS_MS).toEqual([5000, 10000, 20000]);
  });

  it("retries until success", async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("fail");
        }
        return "ok";
      },
      { delaysMs: [0, 0, 0] },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });
});
