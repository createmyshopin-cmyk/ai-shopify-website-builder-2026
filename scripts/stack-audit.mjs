#!/usr/bin/env node
/**
 * Stack freshness audit — Node 22+, workspace engines, critical deploy files.
 * Run: npm run audit:stack
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const checks = [];

function record(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
record("Node major >= 22", nodeMajor >= 22, process.version);

const rootPkg = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
const engines = rootPkg.engines?.node ?? "";
record("engines.node declared", Boolean(engines), engines);

const requiredFiles = [
  "Dockerfile",
  "docker-compose.prod.yml",
  "docs/runbook.md",
  "packages/api/src/common/logger.ts",
  "packages/api/src/common/rate-limit.middleware.ts",
  "mvp/app/routes/webhooks.app.uninstalled.tsx",
  "mvp/app/routes/webhooks.app.scopes_update.tsx",
];

for (const file of requiredFiles) {
  record(`file: ${file}`, existsSync(path.join(repoRoot, file)));
}

const shopifyToml = path.join(repoRoot, "mvp", "shopify.app.toml");
if (existsSync(shopifyToml)) {
  const toml = readFileSync(shopifyToml, "utf8");
  record("shopify.app.toml present", true);
  record(
    "shopify.app.toml has application_url",
    /application_url\s*=/.test(toml),
  );
} else {
  record("shopify.app.toml present", false);
}

const failed = checks.filter((c) => !c.pass);
console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
