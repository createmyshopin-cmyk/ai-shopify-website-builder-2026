import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLlmThemeMapFromPath } from "../packages/shared/src/blueprint/llm-map/build-llm-map.ts";
import {
  findRepoRoot,
  resolveBaseThemePath,
} from "../packages/shared/src/blueprint/local-theme-reader.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(__dirname);

async function main(): Promise<void> {
  const themePath = resolveBaseThemePath(
    process.env.BASE_THEME_PATH ?? "./base theme",
    repoRoot,
  );
  const outputPath = path.join(repoRoot, "docs", "theme-llm-map.json");

  console.info("[generate-theme-llm-map] Reading theme from:", themePath);

  const map = await buildLlmThemeMapFromPath(themePath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");

  console.info("[generate-theme-llm-map] Wrote:", outputPath);
  console.info("[generate-theme-llm-map] Stats:", {
    themeName: map.meta.themeName,
    themeVersion: map.meta.themeVersion,
    sections: map.meta.sectionCount,
    blocks: map.meta.blockCount,
    landingCatalog: map.landingPageCatalog.length,
    recipes: map.landingPageRecipes.length,
  });
}

main().catch((error) => {
  console.error("[generate-theme-llm-map] Failed:", error);
  process.exit(1);
});
