# Phase 5 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 5 — Theme compiler, safety gates, upload worker |
| Completed | 2025-06-22 |
| Milestone | M2 — Deterministic theme output + guardrails |
| PRD items closed | Compiler engine, safety layer, production guardrails, upload |
| Sign-off | [phase-5-signoff.md](../qa/phase-5-signoff.md) |

## Process summary

Phase 5 moves theme file generation out of AI agents into a deterministic compiler in `@theme-editor/shared`. The validation agent runs a five-gate safety pipeline (JSON → Schema → Asset → Section → Theme) with PRD guardrails (20MB / 20MP, fonts, missing assets). The UPLOAD pipeline step now calls `runUploadProcessor`, which uploads `templates/index.json` and `config/settings_data.json` to the draft theme via Shopify `themeFilesUpsert` when a session token and `draftThemeId` exist; otherwise it records a mock manifest (`MOCK_SHOPIFY_UPLOAD=true` or `MOCK_AI=true`).

## Architecture

```
Vision/Copy/Image/Layout (AI) → compileTheme() → CompilerOutput
                                      ↓
                              runUploadProcessor()
                                      ↓
                         themeFilesUpsert (or mock manifest)
                                      ↓
                         runSafetyPipeline() → ValidationOutput
```

## Key modules

| Module | Path |
|--------|------|
| Deterministic compiler | `packages/shared/src/compiler/compile-theme.ts` |
| Safety pipeline | `packages/shared/src/validators/safety-pipeline.ts` |
| Upload processor | `packages/api/src/workers/upload.processor.ts` |
| Theme API upload | `packages/shared/src/shopify/theme-api.ts` |
| Pipeline integration | `packages/api/src/agents/pipeline-runner.ts` |

## Key decisions

| Decision | Rationale |
|----------|-----------|
| Compiler in `shared`, not API | Reusable in workers, tests, and future CLI |
| AI never writes theme files | PRD: compiler controls all generation |
| Mock upload in dev/CI | No Shopify session required for integration tests |
| Section IDs keep hyphens | Shopify section types are hyphenated; slugify preserves them |

## Env flags

| Variable | Effect |
|----------|--------|
| `MOCK_SHOPIFY_UPLOAD=true` | Skip live Theme API upload |
| `MOCK_AI=true` | Also forces mock upload |
| `USE_BULLMQ=false` | Sync pipeline + mock upload in tests |

## Tests

- `packages/shared/src/compiler/compile-theme.test.ts` — 9 edge cases + inline snapshot
- `packages/shared/src/validators/safety-pipeline.test.ts` — guardrails + gate failures
- `packages/api/src/agents/validation.agent.test.ts` — validation agent wiring
- Integration: UPLOAD job status `COMPLETE` (mock manifest)

## Readiness for Phase 6

- Preview dashboard can read `agentOutputs.compiler` + `upload` manifest
- Validation `passed` flag gates preview readiness
- Live Shopify upload ready when app session + draft theme exist
