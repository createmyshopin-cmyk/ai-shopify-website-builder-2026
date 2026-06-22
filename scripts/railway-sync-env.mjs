#!/usr/bin/env node
/**
 * Sync root .env vars to Railway services (requires `railway login` + `railway link`).
 *
 * Usage:
 *   node scripts/railway-sync-env.mjs --service api
 *   node scripts/railway-sync-env.mjs --service mvp --app-url https://your-mvp.up.railway.app
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const envPath = resolve(repoRoot, ".env");

const args = process.argv.slice(2);
const serviceIdx = args.indexOf("--service");
const service = serviceIdx >= 0 ? args[serviceIdx + 1] : "api";
const appUrlIdx = args.indexOf("--app-url");
const appUrlOverride = appUrlIdx >= 0 ? args[appUrlIdx + 1] : undefined;

const API_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "REDIS_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "MOCK_AI",
  "MOCK_SHOPIFY_UPLOAD",
  "USE_BULLMQ",
  "BASE_THEME_PATH",
  "BASE_THEME_ZIP_URL",
  "REPO_ROOT",
  "NODE_ENV",
  "API_RATE_LIMIT_MAX",
];

const MVP_VARS = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
  "SCOPES",
  "DATABASE_URL",
  "DIRECT_URL",
  "PROJECT_API_URL",
  "NODE_ENV",
];

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function railwaySet(key, value, svc) {
  const escaped = value.replace(/"/g, '\\"');
  execSync(`railway variables set ${key}="${escaped}" --service "${svc}"`, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

function main() {
  if (!existsSync(envPath)) {
    console.error("Missing .env at repo root");
    process.exit(1);
  }

  const env = parseEnv(envPath);
  const keys = service === "mvp" ? MVP_VARS : API_VARS;

  if (service === "api") {
    env.NODE_ENV = env.NODE_ENV || "production";
    if (!env.USE_BULLMQ) env.USE_BULLMQ = "false";
  }

  if (service === "mvp") {
    env.NODE_ENV = env.NODE_ENV || "production";
    env.PROJECT_API_URL =
      "https://ai-shopify-website-builder-2026-production.up.railway.app";
    if (appUrlOverride) {
      env.SHOPIFY_APP_URL = appUrlOverride;
    }
    if (!env.SHOPIFY_APP_URL || env.SHOPIFY_APP_URL.includes("example.com")) {
      console.warn(
        "Warning: SHOPIFY_APP_URL not set — pass --app-url https://your-mvp.up.railway.app",
      );
    }
  }

  console.log(`Syncing ${keys.length} variables to Railway service "${service}"...`);

  for (const key of keys) {
    const value = env[key];
    if (value === undefined || value === "") {
      console.warn(`  skip ${key} (empty)`);
      continue;
    }
    console.log(`  set ${key}`);
    railwaySet(key, value, service);
  }

  console.log("\nDone. Redeploy the service in Railway if it did not auto-redeploy.");
}

main();
