# Phase 9 — Sign-off

## Gate criteria

| Criterion | Result |
|-----------|--------|
| Pre-apply backup persisted | Pass |
| POST /apply requires `approved: true` | Pass |
| Version snapshot on apply | Pass |
| POST /rollback restores prior version | Pass |
| Auto-rollback on apply failure (60s) | Pass (service logic) |
| Approve & apply UI | Pass |
| UJ-06 / UJ-07 API journeys | Pass |
| `npm run test:phase-0-9` | Pass (run at sign-off) |

## Evidence

- `docs/phases/phase-9-record.md`
- `packages/shared/src/apply/`
- `packages/api/src/projects/apply.service.ts`
- `mvp/app/components/editor/ApplyApprovalPanel.tsx`

## Approved for Phase 10

Production hardening, observability, full regression UJ-01–UJ-08.
