import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@theme-editor/shared": path.resolve(
        __dirname,
        "packages/shared/src/index.ts",
      ),
    },
  },
  test: {
    include: [
      "packages/shared/**/*.test.ts",
      "packages/api/**/*.test.ts",
    ],
    environment: "node",
  },
});