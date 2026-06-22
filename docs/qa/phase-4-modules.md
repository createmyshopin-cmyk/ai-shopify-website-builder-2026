# Phase 4 — Module checklist

| Module | Path | Status |
|--------|------|--------|
| Queue constants | `packages/shared/src/queue/` | Done |
| Idempotency keys | `packages/shared/src/queue/idempotency.ts` | Done |
| Pipeline runner | `packages/api/src/agents/pipeline-runner.ts` | Done |
| Queue service | `packages/api/src/queue/queue.service.ts` | Done |
| BullMQ worker | `packages/api/src/workers/pipeline.worker.ts` | Done |
| Workers entry | `packages/workers/src/index.ts` | Done |
| Realtime publisher | `packages/api/src/realtime/realtime.service.ts` | Done |
| ProjectEvent migration | `packages/db/prisma/migrations/20250621150000_project_events/` | Done |
| Progress UI | `mvp/app/components/ProjectProgress.tsx` | Done |
| Events API | `GET /api/projects/events/:id` | Done |

## Subtasks (plan 4.1–4.7)

- [x] 4.1 BullMQ + Redis 7 flow in workers
- [x] 4.2 Retry 3× backoff 5s/10s/20s; idempotent job keys
- [x] 4.3 Initiate enqueues flow; status from DB
- [x] 4.4 Supabase Realtime + `ProjectEvent` audit
- [x] 4.5 `ProjectProgress.tsx` PRD messages
- [x] 4.6 `npm run test:perf` idempotency guards
- [x] 4.7 Stable upload/pipeline job ids (no duplicate enqueue)
