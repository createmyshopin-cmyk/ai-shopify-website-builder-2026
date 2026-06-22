## Phase 0 Module Status

- [x] All subtasks (0.1–0.8) marked DONE
- [x] Phase acceptance criteria verified
- [x] Automated test suite green (unit + integration + e2e harness)
- [x] Performance budget N/A
- [x] `phase-0-discrepancies.md` — 0 Blockers, 0 Majors
- [x] `docs/phases/phase-0-record.md` complete
- [x] `phase-0-signoff.md` — Approved: YES

## Subtasks

- [x] **0.1** Infra — Monorepo scaffold | AC: workspaces resolve | Evidence: `package.json`, `packages/*`
- [x] **0.2** Infra — Stack audit | AC: Node 22, API April26 | Evidence: `docs/stack-versions.md`, `shopify.server.ts`
- [x] **0.3** DB — PostgreSQL Prisma | AC: schema in packages/db | Evidence: `packages/db/prisma/schema.prisma`
- [x] **0.4** API — NestJS initiate stub | AC: 202 response | Evidence: `tests/integration/api.projects.test.ts`
- [x] **0.5** UI — Presets + wire styles | AC: calls API | Evidence: `app.styles.tsx`, `presets.test.ts`
- [x] **0.6** QA — Vitest/Playwright/CI | AC: tests pass | Evidence: `.github/workflows/ci.yml`
- [x] **0.7** QA — docs/qa + docs/phases templates | Evidence: `docs/qa/`, `docs/phases/`
- [x] **0.8** Infra — docker-compose | Evidence: `docker-compose.yml`
