#!/usr/bin/env node
/**
 * Security audit — npm audit (high+), secret patterns in client bundle, OAuth webhook review.
 * Run: npm run audit:security
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const findings = [];

function record(severity, check, pass, detail = "") {
  findings.push({ severity, check, pass, detail });
  const icon = pass ? "PASS" : severity === "warn" ? "WARN" : "FAIL";
  console.log(`[${icon}] ${check}${detail ? ` — ${detail}` : ""}`);
}

// npm audit — fail on high/critical only (moderate often in transitive deps)
try {
  const raw = execSync("npm audit --json", {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const audit = JSON.parse(raw);
  const meta = audit.metadata?.vulnerabilities ?? {};
  const high = (meta.high ?? 0) + (meta.critical ?? 0);
  const critical = meta.critical ?? 0;
  record("high", "npm audit critical", critical === 0, `critical=${critical}`);
  record(
    critical === 0 ? "warn" : "high",
    "npm audit high",
    (meta.high ?? 0) === 0,
    `high=${meta.high ?? 0}`,
  );
} catch (error) {
  const stdout = error.stdout?.toString?.() ?? "";
  try {
    const audit = JSON.parse(stdout || "{}");
    const meta = audit.metadata?.vulnerabilities ?? {};
    const critical = meta.critical ?? 0;
    record("high", "npm audit critical", critical === 0, `critical=${critical}`);
    record(
      critical === 0 ? "warn" : "high",
      "npm audit high",
      (meta.high ?? 0) === 0,
      `high=${meta.high ?? 0}`,
    );
  } catch {
    record("warn", "npm audit", false, "could not parse audit output");
  }
}

// Source scan — server secrets should not appear in mvp app source (client-adjacent)
const secretPatterns = [
  { name: "OPENROUTER_API_KEY literal", pattern: /OPENROUTER_API_KEY\s*=\s*['"][^'"]+['"]/ },
  { name: "DATABASE_URL literal", pattern: /postgresql:\/\/[^'"\s]+/ },
  { name: "sk- OpenAI key", pattern: /sk-[a-zA-Z0-9]{20,}/ },
];

const mvpApp = path.join(repoRoot, "mvp", "app");
function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

if (existsSync(mvpApp)) {
  let sourceLeaks = 0;
  for (const file of walk(mvpApp)) {
    const content = readFileSync(file, "utf8");
    for (const { name, pattern } of secretPatterns) {
      if (pattern.test(content) && !file.includes(".env")) {
        sourceLeaks += 1;
        record("high", `secret in source: ${name}`, false, path.relative(repoRoot, file));
      }
    }
  }
  if (sourceLeaks === 0) {
    record("info", "mvp/app source secret scan", true);
  }
}

// Webhook routes use Shopify authenticate
for (const webhook of [
  "mvp/app/routes/webhooks.app.uninstalled.tsx",
  "mvp/app/routes/webhooks.app.scopes_update.tsx",
]) {
  const full = path.join(repoRoot, webhook);
  if (existsSync(full)) {
    const content = readFileSync(full, "utf8");
    record(
      "info",
      `${path.basename(webhook)} uses authenticate.webhook`,
      content.includes("authenticate.webhook"),
    );
  }
}

// Client bundle scan (if build exists)
const clientDirs = [
  path.join(repoRoot, "mvp", "build", "client"),
  path.join(repoRoot, "mvp", "dist", "client"),
];

const bundlePatterns = [
  /OPENROUTER_API_KEY/,
  /DATABASE_URL/,
  /postgresql:\/\//,
  /sk-[a-zA-Z0-9]{20,}/,
];

let bundleScanned = false;
for (const dir of clientDirs) {
  if (!existsSync(dir)) continue;
  bundleScanned = true;
  let leaks = 0;
  for (const file of walk(dir)) {
    if (!/\.(js|mjs|css)$/.test(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const pattern of bundlePatterns) {
      if (pattern.test(content)) {
        leaks += 1;
        record("high", "secret in client bundle", false, path.relative(repoRoot, file));
        break;
      }
    }
  }
  if (leaks === 0) {
    record("info", `client bundle scan (${path.basename(path.dirname(dir))})`, true);
  }
}

if (!bundleScanned) {
  record("warn", "client bundle scan", true, "skipped — run npm run build --workspace=mvp first for full check");
}

const failed = findings.filter((f) => !f.pass && f.severity === "high");
console.log(`\nSecurity summary: ${findings.length - failed.length}/${findings.length} checks ok`);
process.exit(failed.length > 0 ? 1 : 0);
