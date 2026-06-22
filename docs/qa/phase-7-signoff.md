# Phase 7 — Sign-off

## Gate criteria

| Criterion | Result |
|-----------|--------|
| GET preview state when validation passed | Pass |
| PATCH reorder / edit / toggle / add section | Pass |
| Blueprint-only section types | Pass |
| Visual editor in preview dashboard | Pass |
| One-level undo | Pass |
| UJ-04 API journey | Pass |
| `npm run test:phase-0-7` | Pass (run at sign-off) |

## Evidence

- `docs/phases/phase-7-record.md`
- `packages/shared/src/preview/`
- `packages/api/src/projects/preview-edit.service.ts`
- `mvp/app/components/editor/VisualEditor.tsx`
- `tests/integration/uj-04-preview-editor.test.ts`

## Approved for Phase 8

AI chat editor scoped to preview (`POST /api/projects/chat`).
