# PRD Traceability Matrix

| PRD Section | Phase | Verification | Status |
|-------------|-------|--------------|--------|
| Select Product | 0 | MVP product picker, UJ-02 | Pass |
| Select Style Preset | 0 | `presets.test.ts` | Pass |
| POST /api/projects/initiate | 0–1 | `api.projects.test.ts` | Pass |
| Architecture split (MVP + API) | 0 | monorepo layout | Pass |
| Create Project (DB) | 1 | integration + cross-phase smoke | Pass |
| Base Theme Blueprint Engine | 2 | `build-blueprint.test.ts` | Pass |
| Draft theme provisioning | 2 | `theme-api.ts` | Pass |
| AI Agents (Vision → Validation) | 3 | `api.projects.test.ts`, golden fixtures | Pass |
| Async job queue (BullMQ) | 4 | `queue.service.ts`, workers | Pass |
| Realtime progress events | 4 | `ProjectEvent`, events API | Pass |
| Retry policy 5s/10s/20s | 2 | `retry.test.ts` | Pass |
| Theme Compiler Engine | 5 | `compile-theme.test.ts` | Pass |
| Safety layer (5 gates) | 5 | `safety-pipeline.ts` | Pass |
| Production guardrails | 5 | size/font/asset validators | Pass |
| Upload worker (draft theme) | 5 | `upload.processor.ts` | Pass |
| Preview dashboard | 6 | `PreviewDashboard.tsx`, preview API | Pass |
| GET /api/projects list | 6 | `GET /api/projects` | Pass |
| GET preview full payload | 6 | `uj-03-preview-journey.test.ts` | Pass |
| Visual editor | 7 | `VisualEditor.tsx`, PATCH preview | Pass |
| Drag-and-drop reorder | 7 | dnd-kit + reorder patch | Pass |
| PATCH preview state (draft) | 7 | `preview-edit.service.ts` | Pass |
| POST /api/projects/chat | 8 | `uj-05-chat-refinement.test.ts` | Pass |
| Chat adversarial hardening | 8 | `adversarial-fixtures.ts`, sanitize | Pass |
| POST /api/projects/apply + backup | 9 | `uj-06-apply-journey.test.ts` | Pass |
| Version history + rollback | 9 | `uj-07-rollback-journey.test.ts` | Pass |
| Approve before apply | 9 | `ApplyApprovalPanel.tsx` | Pass |
| Structured logging | 10 | `logger.ts`, request middleware | Pass |
| API rate limiting | 10 | `rate-limit.middleware.ts`, UJ-08 | Pass |
| Docker production deploy | 10 | `Dockerfile`, `docker-compose.prod.yml` | Pass |
| Security audit | 10 | `security-audit.mjs`, no-secrets scan | Pass |
| Full regression UJ-01–UJ-08 | 10 | `uj-08-production-readiness.test.ts` | Pass |
| Load test (concurrent pipelines) | 10 | `phase-10-concurrent-pipeline.test.ts` | Pass |
| Operations runbook | 10 | `docs/runbook.md` | Pass |
| Shopify webhooks (uninstall/scopes) | 10 | `webhooks.app.*.tsx`, e2e harness | Pass |

## Gate commands

| Phase | Command |
|-------|---------|
| 0–4 | `npm run test:phase-0-4` |
| 0–7 | `npm run test:phase-0-7:auto` |
| 0–8 | `npm run test:phase-0-8` |
| 0–9 | `npm run test:phase-0-9:auto` |
| 0–10 (M5) | `npm run test:phase-0-10:auto` |
