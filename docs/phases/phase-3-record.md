# Phase 3 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 3 — AI Agents (sync pipeline) |
| Completed | 2025-06-22 |
| Milestone | M1.5 — Agent intelligence |
| PRD items closed | AI Agents (Vision–Validation), brand_memory, generated_assets |
| Sign-off | [phase-3-signoff.md](../qa/phase-3-signoff.md) |

## Process summary

Implemented six AI agents that consume the Phase 2 `ThemeBlueprint`, run sequentially in the NestJS API, and persist outputs to `agentOutputs`, `brand_memory`, and `generated_assets`. Jobs update from `PENDING` → `RUNNING` → `COMPLETE`/`FAILED`/`SKIPPED` (UPLOAD). Project status becomes `AGENTS_COMPLETE` or `AGENTS_FAILED` after validation.

## Pipeline order

```
VISION → COPY → IMAGE → LAYOUT → COMPILER → UPLOAD (skipped) → VALIDATION
```

## Key decisions

| Decision | Rationale |
|----------|-----------|
| Sync pipeline in API (no BullMQ yet) | Phase 4 owns queue/realtime |
| `MOCK_AI=true` default in dev | No OpenRouter spend during local dev |
| Validation is programmatic | Guardrail against invented section types |
| Image agent plans assets only | Real generation deferred |

## API

`POST /api/projects/run/:id`  
Headers: `x-shop-domain`  
Body: `{ "shop": "...", "products": [] }` (optional product payload)

## Developer notes

- Set `MOCK_AI=false` and `OPENROUTER_API_KEY` in repo `.env` for live LLM runs
- Restart `npm run dev:api` after env changes
- Styles page auto-calls run pipeline after project initiate

## Readiness for Phase 4

- Job records and statuses ready for BullMQ workers
- Agent outputs stored for compiler/upload phases
