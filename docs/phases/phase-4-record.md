# Phase 4 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 4 — BullMQ pipeline, realtime progress, UI |
| Completed | 2025-06-22 |
| Milestone | M2 prep — Async orchestration |
| PRD items closed | Job queue, progress events, retry/idempotency |
| Sign-off | [phase-4-signoff.md](../qa/phase-4-signoff.md) |

## Process summary

Extracted shared `PipelineRunner` from the Phase 3 sync service. `POST /api/projects/initiate` now enqueues the agent flow (or runs synchronously when `USE_BULLMQ=false` or `REDIS_URL` is unset). BullMQ workers in `packages/workers` process steps Vision → Validation with PRD backoff (5s / 10s / 20s). Progress is persisted to `ProjectEvent` and broadcast via Supabase Realtime when configured. The embedded app shows PRD progress messages through `ProjectProgress.tsx` (polling `GET /api/projects/events/:id`).

## Architecture

```
initiate → QueueService.enqueuePipeline
              ├─ Redis available → BullMQ job (pipeline-{projectId})
              │       └─ workers: step → next step chain
              └─ fallback → PipelineRunner.executeFull (sync)

PipelineRunner → RealtimeService.publish → ProjectEvent + Supabase broadcast
```

## PRD progress messages

```
Analyzing Product → Generating Assets → Uploading Images → Compiling Theme → Validating → Preview Ready
```

## Key decisions

| Decision | Rationale |
|----------|-----------|
| Sync fallback without Redis | Local dev / CI without Docker Redis |
| `USE_BULLMQ=false` in test `.env` | Deterministic integration tests |
| Poll + optional Supabase broadcast | UI works even if Realtime auth not wired in MVP |
| Idempotent `pipeline-{projectId}` job id | Prevents duplicate enqueues on retry |

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects/initiate` | Blueprint + enqueue pipeline |
| POST | `/api/projects/run/:id` | Manual (re)enqueue or sync run |
| GET | `/api/projects/events/:id` | Progress audit trail |
| GET | `/api/projects/status/:id` | Status + `latestProgress` |

## Developer notes

```powershell
npm run docker:up          # Redis 7 (optional)
npm run dev:api            # port 3001
npm run dev:workers        # BullMQ consumer
cd mvp && npm run dev      # Shopify embedded app
```

Set `USE_BULLMQ=true` and `REDIS_URL=redis://localhost:6379` for async mode.

## Readiness for Phase 5

- UPLOAD step stubbed/skipped — Phase 5 upload worker + Shopify asset safety gates
- Compiler output stored in `agentOutputs` for theme file generation
