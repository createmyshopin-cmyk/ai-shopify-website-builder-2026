/**
 * Shopify CLI predev hook — do not run `prisma generate` here.
 * On Windows, generate fails with EPERM when another Node process (e.g. dev:api)
 * already loaded query_engine-windows.dll.node.
 * Run `npm run db:generate` once after schema changes instead.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const reactRouterCache = resolve(process.cwd(), ".react-router");
if (existsSync(reactRouterCache)) {
  try {
    rmSync(reactRouterCache, { recursive: true, force: true });
    console.log("[predev] Cleared .react-router cache");
  } catch {
    console.log("[predev] Could not clear .react-router (dev may be running)");
  }
}

console.log("[predev] Skipping prisma generate (run npm run db:generate after schema changes)");
process.exit(0);
