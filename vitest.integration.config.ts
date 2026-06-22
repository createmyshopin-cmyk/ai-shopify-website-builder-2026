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
      "@theme-editor/db": path.resolve(__dirname, "packages/db/src/index.ts"),
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 150_000,
    hookTimeout: 240_000,
  },
});
