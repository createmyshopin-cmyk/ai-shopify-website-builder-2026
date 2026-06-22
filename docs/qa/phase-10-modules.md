# Phase 10 — Module map

| Module | Path | Role |
|--------|------|------|
| Logger | `packages/api/src/common/logger.ts` | JSON structured logs |
| Request logging | `packages/api/src/common/request-logging.middleware.ts` | HTTP duration + status |
| Rate limit | `packages/api/src/common/rate-limit.middleware.ts` | Per-IP limit on `/api/projects/*` |
| Health | `packages/api/src/health/health.controller.ts` | Phase 10 readiness probe |
| Docker | `Dockerfile`, `docker-compose.prod.yml` | Node 22 API container |
| Stack audit | `scripts/stack-audit.mjs` | Engines + deploy file checks |
| Security audit | `scripts/security-audit.mjs` | npm audit + source/bundle scan |
| Client secrets | `scripts/no-secrets-in-client.mjs` | Post-build MVP scan |
| UJ-08 tests | `tests/integration/uj-08-production-readiness.test.ts` | Health, rate limit, regression |
| Load test | `tests/perf/phase-10-concurrent-pipeline.test.ts` | Concurrent mock pipelines |
| Runbook | `docs/runbook.md` | Ops + deploy + incident |

## Env knobs

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_RATE_LIMIT_MAX` | `120` | Max requests per window per IP |
| `API_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `PHASE_10_CONCURRENCY` | `3` | Load test parallelism (CI) |
| `PHASE_10_P95_MS` | `600000` | 10-minute p95 budget |
