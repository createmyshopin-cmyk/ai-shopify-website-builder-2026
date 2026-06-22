/**
 * apply-rls.ts
 *
 * Applies RLS policies to Supabase PostgreSQL using the service-role key
 * and the Supabase management client (direct connection, bypasses pooler).
 *
 * Usage:
 *   npx ts-node packages/db/supabase/rls/apply-rls.ts
 *   npm run db:apply-rls
 *
 * Required env:
 *   DIRECT_URL  — direct Supabase PostgreSQL connection string (port 5432)
 *
 * The script reads 001_platform_rls.sql and executes it against the database.
 * Safe to re-run: all policies use DROP IF EXISTS before CREATE.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env") });

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyRls(): Promise<void> {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL environment variable is required for RLS apply");
  }

  const sqlPath = join(__dirname, "001_platform_rls.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("[apply-rls] Connecting to database...");
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    console.log("[apply-rls] Applying RLS policies...");
    await client.query(sql);
    console.log("[apply-rls] RLS policies applied successfully.");

    const result = await client.query<{ tablename: string; policyname: string }>(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (
          'DesignProject', 'ProjectEvent', 'ProjectJob', 'GeneratedAsset',
          'ThemeVersion', 'ThemeBackup', 'BrandMemory', 'PreviewSession', 'PublishedTheme'
        )
      ORDER BY tablename, policyname
    `);

    console.log(`\n[apply-rls] Active RLS policies (${result.rows.length} total):`);
    for (const row of result.rows) {
      console.log(`  ${row.tablename}.${row.policyname}`);
    }
  } finally {
    await client.end();
  }
}

applyRls().catch((err) => {
  console.error("[apply-rls] Fatal:", err.message);
  process.exit(1);
});
