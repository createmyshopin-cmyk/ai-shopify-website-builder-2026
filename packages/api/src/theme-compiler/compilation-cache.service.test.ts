import { describe, it, expect, beforeEach } from "vitest";

import { CompilationCacheService } from "./compilation-cache.service.js";
import type { CompilerOutput } from "@theme-editor/shared";

const MOCK_OUTPUT: CompilerOutput = {
  indexJson: {
    sections: { "editorial-hero": { type: "editorial-hero", settings: {} } },
    order: ["editorial-hero"],
  },
  settingsPatch: { primary: "#2d1b4e" },
  cssVariables: { "--color-primary": "#2d1b4e" },
};

describe("CompilationCacheService", () => {
  let cache: CompilationCacheService;

  beforeEach(() => {
    // No REDIS_URL set — uses memory fallback
    delete process.env.REDIS_URL;
    cache = new CompilationCacheService();
  });

  describe("compiled output cache", () => {
    it("returns null on cache miss", async () => {
      const result = await cache.getCompiledOutput("nonexistent-key");
      expect(result).toBeNull();
    });

    it("returns cached output after set", async () => {
      await cache.setCompiledOutput("test-key", MOCK_OUTPUT);
      const result = await cache.getCompiledOutput("test-key");
      expect(result).toEqual(MOCK_OUTPUT);
    });

    it("ttlSec=0 is treated as no-TTL — item remains in cache", async () => {
      // 0 is falsy in JS, so the cache treats it as "no expiry"
      await cache.setCompiledOutput("ttl-key", MOCK_OUTPUT, 0);
      const result = await cache.getCompiledOutput("ttl-key");
      expect(result).toEqual(MOCK_OUTPUT);
    });
  });

  describe("buildKey", () => {
    it("produces deterministic keys", () => {
      const k1 = cache.buildKey("proj-1", "high-converting", ["prod-a", "prod-b"]);
      const k2 = cache.buildKey("proj-1", "high-converting", ["prod-b", "prod-a"]); // different order
      expect(k1).toBe(k2); // sorted — same result
    });

    it("produces different keys for different presets", () => {
      const k1 = cache.buildKey("proj-1", "high-converting", []);
      const k2 = cache.buildKey("proj-1", "fashion", []);
      expect(k1).not.toBe(k2);
    });

    it("produces different keys for different projects", () => {
      const k1 = cache.buildKey("proj-1", "high-converting", []);
      const k2 = cache.buildKey("proj-2", "high-converting", []);
      expect(k1).not.toBe(k2);
    });
  });

  describe("resolved tokens cache", () => {
    it("caches and retrieves resolved tokens", async () => {
      const tokens = { primary: "#2d1b4e", background: "#fafaf8" };
      await cache.setResolvedTokens("high-converting", tokens);
      const result = await cache.getResolvedTokens("high-converting");
      expect(result).toEqual(tokens);
    });
  });

  describe("invalidate", () => {
    it("removes keys matching the prefix pattern", async () => {
      // setCompiledOutput prefixes the key with "compiled:"
      // so the actual memory key is "compiled:proj-1:high-converting:"
      await cache.setCompiledOutput("proj-1:high-converting:", MOCK_OUTPUT);

      // Invalidate using the full prefix including the "compiled:" namespace
      await cache.invalidate("compiled:proj-1:");
      const result = await cache.getCompiledOutput("proj-1:high-converting:");
      expect(result).toBeNull();
    });

    it("does not remove keys that don't match the prefix", async () => {
      await cache.setCompiledOutput("proj-2:fashion:", MOCK_OUTPUT);
      await cache.invalidate("compiled:proj-1:");
      const result = await cache.getCompiledOutput("proj-2:fashion:");
      expect(result).toEqual(MOCK_OUTPUT);
    });
  });
});
