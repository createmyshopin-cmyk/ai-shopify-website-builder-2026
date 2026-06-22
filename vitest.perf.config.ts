import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/perf/**/*.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 120_000,
  },
});
