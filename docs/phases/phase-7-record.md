# Phase 7 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 7 — Visual editor + drag-and-drop |
| Completed | 2025-06-22 |
| Milestone | M3 — Merchant preview editing |
| PRD items closed | Visual editor, DnD sections, block toggle, section picker |
| Sign-off | [phase-7-signoff.md](../qa/phase-7-signoff.md) |

## Process summary

Merchants edit draft preview state from the embedded app: reorder sections (dnd-kit), toggle visibility, pick new sections from the blueprint library, and edit headline/subheading/image/color. Changes persist via `PATCH /api/projects/preview/:id` and optionally re-upload to the draft theme. One-level undo restores the prior snapshot through a `restore` patch.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/preview/:id/state` | Editable preview state |
| PATCH | `/api/projects/preview/:id` | Apply preview patch ops |

## Patch operations

`reorder`, `updateSection`, `toggleSection`, `addSection`, `updateTheme`, `restore`

## UI

| Component | Path |
|-----------|------|
| Visual editor | `mvp/app/components/editor/VisualEditor.tsx` |
| Preview integration | `mvp/app/components/PreviewDashboard.tsx` |
| Editor hook | `mvp/app/hooks/use-preview-editor.ts` |

## Tests

- `packages/shared/src/preview/preview-state.test.ts`
- `tests/integration/uj-04-preview-editor.test.ts`
- `npm run test:phase-0-7`

## Readiness for Phase 8

- Preview state in `agentOutputs.compiler` + `previewEditor`
- Chat API can target same patch pipeline in Phase 8
