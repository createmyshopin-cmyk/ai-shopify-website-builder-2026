# Phase 4 — Sign-off

## Gate criteria

| Criterion | Result |
|-----------|--------|
| BullMQ worker processes pipeline steps | Pass (with Redis + `dev:workers`) |
| Sync fallback without Redis | Pass (`USE_BULLMQ=false`) |
| Progress events persisted | Pass (`ProjectEvent` + integration test) |
| UI shows PRD progress steps | Pass (`ProjectProgress.tsx`) |
| Idempotent pipeline/upload keys | Pass (`test:perf`) |
| `npm run test:all` | Pass (run at sign-off) |

## Evidence

- `docs/phases/phase-4-record.md`
- `tests/integration/api.projects.test.ts` — events endpoint
- `tests/perf/phase-4-idempotency.test.ts`
- `packages/shared/src/queue/*.test.ts`

## Approved for Phase 5

Compiler hardening, upload worker, and Shopify safety gates.
