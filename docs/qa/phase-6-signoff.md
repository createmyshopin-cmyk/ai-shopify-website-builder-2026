# Phase 6 — Sign-off

## Gate criteria

| Criterion | Result |
|-----------|--------|
| `GET /api/projects` tenant-scoped list | Pass |
| `GET /api/projects/preview/:id` metadata + URLs | Pass |
| Preview UI gated until validation | Pass |
| No apply actions on preview page | Pass |
| UJ-03 API journey | Pass |
| `npm run test:phase-0-6` | Pass (run at sign-off) |

## Evidence

- `docs/phases/phase-6-record.md`
- `mvp/app/routes/app.projects._index.tsx`
- `mvp/app/routes/app.projects.$projectId.preview.tsx`
- `e2e/uj-03-preview-journey.spec.ts`
- `tests/integration/api.projects.test.ts`

## Approved for Phase 7

Visual editor, drag-and-drop sections, and E2E UJ-04.
