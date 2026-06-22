# PRD Implementation Progress

Canonical checkbox tracker for [prd.md](../../prd.md). Do not edit the PRD body during implementation.

| ID | Section | Phase | Status | Evidence |
|----|---------|-------|--------|----------|
| PRD-002 | End-to-End — Select Product | 0 | [x] | `mvp/app/routes/app._index.tsx` |
| PRD-003 | End-to-End — Select Style Preset | 0 | [x] | `packages/shared/src/presets.ts` |
| PRD-046 | API — POST /api/projects/initiate (stub) | 0 | [x] | `packages/api/src/projects/` |
| PRD-056 | Architecture — split stack (scaffold) | 0 | [x] | `packages/`, `docker-compose.yml` |
| PRD-001 | Core Principles — Base Theme First | 2 | [x] | `base theme/`, `packages/shared/src/blueprint/` |
| PRD-004 | End-to-End — Create Project (persisted) | 1 | [x] | `packages/api/src/projects/` |
| PRD-005 | Base Theme Blueprint Engine | 2 | [x] | `ThemeBlueprintSchema`, `build-blueprint.ts` |
| PRD-007 | Draft theme provisioning | 2 | [x] | `shopify/theme-api.ts` |
| PRD-008 | AI Agents — Vision through Validation | 3 | [x] | `packages/api/src/agents/` |
| PRD-009 | Async job queue (BullMQ) | 4 | [x] | `packages/workers/`, `queue.service.ts` |
| PRD-010 | Realtime progress events | 4 | [x] | `ProjectEvent`, `realtime.service.ts` |
| PRD-020 | Retry policy 5s/10s/20s | 2 | [x] | `packages/shared/src/utils/retry.ts` |
| PRD-011 | Theme Compiler Engine | 5 | [x] | `packages/shared/src/compiler/` |
| PRD-012 | Safety layer (5 gates) | 5 | [x] | `validators/safety-pipeline.ts` |
| PRD-013 | Production guardrails | 5 | [x] | 20MB/20MP, fonts, assets |
| PRD-014 | Upload worker (draft theme) | 5 | [x] | `upload.processor.ts`, `theme-api.ts` |
| PRD-015 | Preview dashboard | 6 | [x] | `PreviewDashboard.tsx`, preview routes |
| PRD-016 | GET /api/projects list | 6 | [x] | `GET /api/projects` |
| PRD-048 | GET /api/projects/preview/:id (full payload) | 6 | [x] | `preview-url.ts`, metadata |
| PRD-017 | Visual editor (text/image/color) | 7 | [x] | `VisualEditor.tsx` |
| PRD-018 | Drag-and-drop section reorder | 7 | [x] | dnd-kit + `reorder` patch |
| PRD-019 | PATCH preview state (draft only) | 7 | [x] | `preview-edit.service.ts` |
| PRD-050 | POST /api/projects/chat (preview AI) | 8 | [x] | `chat-intent.ts`, `handleChat` |
| PRD-apply | POST /api/projects/apply + backup | 9 | [x] | `apply.service.ts` |
| PRD-version | Theme version history + rollback | 9 | [x] | `ThemeVersion`, `ThemeBackup` |
| PRD-obs | Structured logging + rate limits | 10 | [x] | `packages/api/src/common/` |
| PRD-deploy | Docker Node 22 + runbook | 10 | [x] | `Dockerfile`, `docs/runbook.md` |
| PRD-sec | Security + client secret audits | 10 | [x] | `scripts/security-audit.mjs` |
| PRD-reg | Full regression UJ-01–UJ-08 | 10 | [x] | `uj-08-production-readiness.test.ts` |

See full matrix in [prd-traceability-matrix.md](./prd-traceability-matrix.md).
