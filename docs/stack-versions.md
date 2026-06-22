# Stack Versions — Phase 0

Recorded after Phase 0 scaffold. Run `npm outdated` before each phase gate.

| Package | Target | Notes |
|---------|--------|-------|
| Node.js | 22.x LTS | `engines` in root `package.json` |
| TypeScript | 5.9.x | |
| React | 18.3.x | Upgrade to 19 deferred (DISC-0-002) |
| React Router | 7.12.x | |
| NestJS | 11.1.x | `@theme-editor/api` |
| Prisma | 6.16.x | `@theme-editor/db` |
| PostgreSQL | 17 | Docker image |
| Redis | 7 | Docker image |
| Zod | 3.25.x | `@theme-editor/shared` |
| Vitest | 3.2.x | Root devDependency |
| Playwright | 1.52.x | Root devDependency |
| Shopify Admin API (SDK) | April26 (`2026-04`) | `shopify.server.ts` |
| shopify.app.toml webhooks | 2026-07 | Ahead of SDK — DISC-0-003 |
