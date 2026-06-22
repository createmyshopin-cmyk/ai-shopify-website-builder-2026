import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBlueprintManifestFromPath } from "../packages/shared/src/blueprint/build-manifest.ts";
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
  const outputPath = path.join(repoRoot, "docs", "theme-blueprint-manifest.json");

  console.info("[generate-theme-blueprint-manifest] Reading theme from:", themePath);

  const manifest = await buildBlueprintManifestFromPath(themePath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.info("[generate-theme-blueprint-manifest] Wrote:", outputPath);
  console.info("[generate-theme-blueprint-manifest] Stats:", {
    themeName: manifest.meta.themeName,
    themeVersion: manifest.meta.themeVersion,
    sections: manifest.meta.sectionCount,
    blocks: manifest.meta.blockCount,
    llmMapPath: manifest.llmMapPath,
  });
}

main().catch((error) => {
  console.error("[generate-theme-blueprint-manifest] Failed:", error);
  process.exit(1);
});
