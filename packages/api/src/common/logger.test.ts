import { describe, expect, it, vi } from "vitest";

import { logger } from "./logger.js";

describe("logger", () => {
  it("emits JSON with level and message", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test_event", { foo: "bar" });
    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line.level).toBe("info");
    expect(line.message).toBe("test_event");
    expect(line.foo).toBe("bar");
    expect(line.service).toBe("@theme-editor/api");
    spy.mockRestore();
  });

  it("routes errors to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
