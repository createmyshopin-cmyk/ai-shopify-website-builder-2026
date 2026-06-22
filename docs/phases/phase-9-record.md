# Phase 9 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 9 — Apply, version history, rollback |
| Completed | 2026-06-22 |
| Milestone | M4 — Closed beta (apply workflow) |
| PRD items closed | Apply to live theme, backups, versions, rollback |
| Sign-off | [phase-9-signoff.md](../qa/phase-9-signoff.md) |

## Process summary

Merchants explicitly approve preview changes, then apply them to the **existing live theme** (settings + homepage sections only). Each apply creates a `theme_backups` row before upload and a `theme_versions` snapshot on success. Failed applies auto-restore the backup within 60 seconds. Rollback restores a prior version or pre-apply backup.

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects/apply` | Approved apply to live theme |
| POST | `/api/projects/version` | Manual version snapshot |
| POST | `/api/projects/rollback` | Restore prior version / backup |
| GET | `/api/projects/versions/:id` | List version history |

## UI

| Component | Path |
|-----------|------|
| Approve & apply panel | `mvp/app/components/editor/ApplyApprovalPanel.tsx` |

## Tests

- `packages/shared/src/apply/theme-snapshot.test.ts`
- `tests/integration/uj-06-apply-journey.test.ts`
- `tests/integration/uj-07-rollback-journey.test.ts`
- `npm run test:phase-0-9`

## Readiness for Phase 10

- Full regression + production hardening
- Observability, load tests, App Store compliance
