# Phase 6 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 6 — Preview dashboard, project list, UJ-03 |
| Completed | 2025-06-22 |
| Milestone | Internal alpha |
| PRD items closed | Preview dashboard, GET preview payload, project list |
| Sign-off | [phase-6-signoff.md](../qa/phase-6-signoff.md) |

## Process summary

Merchants can list design projects, open a gated preview dashboard, and see generated homepage metadata after validation passes. The preview API returns storefront and admin editor URLs when a `draftThemeId` exists; otherwise mock mode shows compiler/layout summary without apply actions.

## Routes

| Surface | Path |
|---------|------|
| Project list | `/app/projects` |
| Preview dashboard | `/app/projects/:id/preview` |
| List API | `GET /api/projects` |
| Preview API | `GET /api/projects/preview/:id` |

## Key modules

| Module | Path |
|--------|------|
| Preview URL helpers | `packages/shared/src/shopify/preview-url.ts` |
| Preview + list API | `packages/api/src/projects/projects.service.ts` |
| Preview dashboard UI | `mvp/app/components/PreviewDashboard.tsx` |
| Project list UI | `mvp/app/routes/app.projects._index.tsx` |

## Preview gating

- `ready` requires `AGENTS_COMPLETE`, validation job `COMPLETE`, and `validation.passed === true`
- UI polls preview endpoint until ready; no apply/chat actions exposed
- Storefront iframe only when `previewUrl` is available

## Tests

- `packages/shared/src/shopify/preview-url.test.ts`
- Integration: list + preview metadata
- `e2e/uj-03-preview-journey.spec.ts` — API UJ-03
- `npm run test:phase-0-6`

## Readiness for Phase 7

- Preview state available via `agentOutputs` and preview API metadata
- Draft theme URLs ready for visual editor binding
