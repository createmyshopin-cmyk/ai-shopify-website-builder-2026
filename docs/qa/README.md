# QA — Phase Gate Workflow

Every phase must pass the gate before the next phase starts.

## Artifacts per phase

| File | Purpose |
|------|---------|
| `phase-{N}-modules.md` | Subtask + module checklists |
| `phase-{N}-prd-checklist.md` | PRD rows verified this phase |
| `phase-{N}-discrepancies.md` | Gaps and fixes |
| `phase-{N}-signoff.md` | Approved YES/NO |
| `../phases/phase-{N}-record.md` | Stakeholder summary + developer docs |

## Gate steps

1. Mark all subtasks DONE with evidence
2. Run `npm run test` (unit + integration + e2e)
3. Check off PRD items in `prd-progress.md`
4. Complete `phase-{N}-record.md`
5. Sign off in `phase-{N}-signoff.md`
