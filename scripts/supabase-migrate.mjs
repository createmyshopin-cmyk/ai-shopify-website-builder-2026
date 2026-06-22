#!/usr/bin/env node
/**
 * Apply Prisma migrations to Supabase and verify schema.
 * Uses DIRECT_URL (port 5432) for migrate deploy per Supabase + Prisma guidance.
 *
 * Run: npm run db:migrate:supabase
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const dbPkg = path.join(repoRoot, "packages", "db");

function run(label, command, cwd = dbPkg, optional = false) {
  console.log(`\n→ ${label}`);
  try {
    execSync(command, { cwd, stdio: "inherit", env: process.env });
  } catch (error) {
    if (optional) {
      console.warn(`  (skipped — ${label} failed; stop API and run npm run db:generate)`);
      return;
    }
    throw error;
  }
}

function main() {
  if (!process.env.DATABASE_URL?.includes("supabase")) {
    console.warn(
      "Warning: DATABASE_URL does not look like Supabase — continuing anyway.",
    );
  }
  if (!process.env.DIRECT_URL) {
    console.error("Missing DIRECT_URL in .env (required for Prisma migrations).");
    process.exit(1);
  }

  console.log("=== Supabase Prisma migrate ===");
  console.log(`Host: ${process.env.DIRECT_URL.replace(/:[^:@]+@/, ":***@")}`);

  run("prisma generate", "npx prisma generate", dbPkg, true);
  run("prisma migrate deploy", "npx prisma migrate deploy");
  run("prisma migrate status", "npx prisma migrate status");

  console.log("\n→ db:verify");
  execSync("npm run db:verify", { cwd: repoRoot, stdio: "inherit", env: process.env });

  console.log("\nSupabase migrate complete.\n");
}

main();
