#!/usr/bin/env node
/**
 * Fail if built MVP client assets contain server-only secret patterns.
 * Run after: npm run build --workspace=mvp
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(repoRoot, "mvp", "build", "client");

const patterns = [
  { label: "OPENROUTER_API_KEY", re: /OPENROUTER_API_KEY/ },
  { label: "DATABASE_URL", re: /DATABASE_URL/ },
  { label: "postgres connection string", re: /postgresql:\/\/[^\s'"]+/ },
  { label: "OpenAI sk- key", re: /sk-[a-zA-Z0-9]{20,}/ },
];

if (!existsSync(clientRoot)) {
  console.error("Missing mvp/build/client — run npm run build --workspace=mvp first");
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.(js|mjs|css|html)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const leaks = [];
for (const file of walk(clientRoot)) {
  const content = readFileSync(file, "utf8");
  for (const { label, re } of patterns) {
    if (re.test(content)) {
      leaks.push({ file: path.relative(repoRoot, file), label });
    }
  }
}

if (leaks.length > 0) {
  console.error("Secret patterns found in client bundle:");
  for (const leak of leaks) {
    console.error(`  - ${leak.label}: ${leak.file}`);
  }
  process.exit(1);
}

console.log("No secret patterns in mvp/build/client");
