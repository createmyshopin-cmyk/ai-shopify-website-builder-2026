/**
 * Quick DB verification after schema/migration updates.
 * Run: npm run db:verify
 */
import "dotenv/config";

import { prisma } from "@theme-editor/db";

const REQUIRED_TABLES = [
  "Session",
  "UserAccount",
  "DesignProject",
  "ProjectJob",
  "ProjectEvent",
  "GeneratedAsset",
  "ThemeVersion",
  "ThemeBackup",
  "BrandMemory",
];

async function main() {
  console.log("\n=== Database verification ===\n");

  await prisma.$queryRaw`SELECT 1`;
  console.log("[PASS] Connection");

  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const names = new Set(tables.map((t) => t.tablename));

  for (const table of REQUIRED_TABLES) {
    const ok = names.has(table);
    console.log(`[${ok ? "PASS" : "FAIL"}] Table ${table}`);
    if (!ok) process.exitCode = 1;
  }

  const migrations = await prisma.$queryRaw`
    SELECT migration_name FROM _prisma_migrations ORDER BY finished_at
  `;
  console.log(`\nApplied migrations (${migrations.length}):`);
  for (const m of migrations) {
    console.log(`  - ${m.migration_name}`);
  }

  const counts = await Promise.all([
    prisma.designProject.count(),
    prisma.projectJob.count(),
    prisma.themeVersion.count(),
    prisma.themeBackup.count(),
  ]);
  console.log("\nRow counts:");
  console.log(`  DesignProject: ${counts[0]}`);
  console.log(`  ProjectJob:    ${counts[1]}`);
  console.log(`  ThemeVersion:  ${counts[2]}`);
  console.log(`  ThemeBackup:   ${counts[3]}`);

  await prisma.$disconnect();
  console.log("\nDatabase OK.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
