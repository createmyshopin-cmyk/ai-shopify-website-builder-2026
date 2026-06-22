#!/usr/bin/env node
/**
 * Patch mvp/shopify.app.toml application_url + redirect_urls from SHOPIFY_APP_URL.
 *
 * Usage:
 *   dotenv -e .env -- node scripts/sync-shopify-app-url.mjs
 *   node scripts/sync-shopify-app-url.mjs --url https://your-mvp.up.railway.app
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const tomlPath = resolve(__dirname, "..", "mvp", "shopify.app.toml");

const urlIdx = process.argv.indexOf("--url");
const appUrl = (
  urlIdx >= 0 ? process.argv[urlIdx + 1] : process.env.SHOPIFY_APP_URL
)?.replace(/\/$/, "");

if (!appUrl || appUrl.includes("example.com") || appUrl.includes("localhost")) {
  console.error(
    "Set SHOPIFY_APP_URL in .env or pass --url https://your-production-host",
  );
  process.exit(1);
}

let toml = readFileSync(tomlPath, "utf8");
toml = toml.replace(
  /application_url = ".*"/,
  `application_url = "${appUrl}"`,
);
toml = toml.replace(
  /redirect_urls = \[[\s\S]*?\]/,
  `redirect_urls = [
  "${appUrl}/auth/callback",
  "${appUrl}/auth/shopify/callback",
]`,
);

writeFileSync(tomlPath, toml);
console.log(`Updated ${tomlPath} → ${appUrl}`);
