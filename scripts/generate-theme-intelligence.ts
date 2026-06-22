#!/usr/bin/env tsx
/**
 * generate-theme-intelligence.ts
 *
 * Builds all intelligence catalogs from the Base Theme (Horizon Pro 2.7.0).
 * Phase 0 first: scans base theme → base-theme-truth.json (authoritative source).
 * Then builds all catalogs from that truth — never from inference.
 *
 * Output: packages/shared/src/intelligence/catalogs/
 *         docs/intelligence/base-theme-truth.json
 *
 * Usage:
 *   npm run generate:intelligence
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

// Import directly from source — tsx handles TypeScript paths
import { buildAll } from "../packages/shared/src/intelligence/builders/build-all.js";
import { findRepoRoot } from "../packages/shared/src/blueprint/local-theme-reader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const repoRoot = await findRepoRoot(__dirname);
  const baseThemePath   = path.join(repoRoot, "base theme");
  const outputDir       = path.join(repoRoot, "packages", "shared", "src", "intelligence", "catalogs");
  const truthOutputPath = path.join(repoRoot, "docs", "intelligence", "base-theme-truth.json");

  console.log("🔍 Base Theme Intelligence Generator");
  console.log(`   Theme:  ${baseThemePath}`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Truth:  ${truthOutputPath}`);
  console.log("");

  const result = await buildAll({
    baseThemePath,
    outputDir,
    writeTruthFile: true,
    truthOutputPath,
  });

  console.log("\n✅ Generation complete!");
  console.log(`   Token files:   ${result.tokenCount}`);
  console.log(`   Sections:      ${result.sectionCount}`);
  console.log(`   Presets:       ${result.presetCount}`);
  console.log(`   Variants:      ${result.variantCount}`);
  console.log(`   Flow files:    ${result.flowCount}`);
  console.log(`   Index files:   ${result.indexCount}`);
  console.log(`   Snippets:      ${result.snippetCount}`);
  console.log(`   Block types:   ${result.blockCount}`);
  console.log(`   Templates:     ${result.templateCount}`);
  console.log(`\n   Catalogs: ${outputDir}`);
  console.log(`   Truth:    ${truthOutputPath}`);
}

main().catch((err) => {
  console.error("❌ generate-theme-intelligence failed:", err);
  process.exit(1);
});
