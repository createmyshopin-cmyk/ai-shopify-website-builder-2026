# Phase 8 — Sign-off

## Gate criteria

| Criterion | Result |
|-----------|--------|
| POST /api/projects/chat preview-only | Pass |
| Sanitize Liquid/path/HTML injection | Pass |
| Intent → PreviewPatch pipeline | Pass |
| Chat panel in preview dashboard | Pass |
| 50+ adversarial unit cases | Pass |
| UJ-05 API journey | Pass |
| `npm run test:phase-0-8` | Pass (run at sign-off) |

## Evidence

- `docs/phases/phase-8-record.md`
- `packages/shared/src/chat/`
- `packages/api/src/projects/preview-edit.service.ts` (`handleChat`)
- `mvp/app/components/editor/ChatPanel.tsx`
- `tests/integration/uj-05-chat-refinement.test.ts`

## Approved for Phase 9

Apply workflow, version history, rollback (`POST /api/projects/apply`).
