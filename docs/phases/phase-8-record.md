# Phase 8 — Completion Record

## At a glance

| Field | Value |
|-------|-------|
| Phase | 8 — AI chat editor |
| Completed | 2026-06-22 |
| Milestone | Merchant chat refinements in preview |
| PRD items closed | AI Chat Editor, POST /api/projects/chat |
| Sign-off | [phase-8-signoff.md](../qa/phase-8-signoff.md) |

## Process summary

Merchants refine the draft preview with natural-language chat. Messages are sanitized (no Liquid, paths, or HTML), parsed into safe `PreviewPatch` operations, and applied through the same pipeline as the visual editor. Chat history is stored in `agentOutputs.previewEditor.chatHistory` (audit trail per project).

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects/chat` | Parse intent → apply preview patches |

## Example intents (MOCK_AI)

- “Change colors to black” → `updateTheme`
- “Add FAQ section” → `addSection`
- “Make hero smaller” → `updateSection` compact settings
- “Change the headline to …” → hero `updateSection`

## UI

| Component | Path |
|-----------|------|
| Chat panel | `mvp/app/components/editor/ChatPanel.tsx` |
| Preview integration | `mvp/app/components/PreviewDashboard.tsx` |

## Tests

- `packages/shared/src/chat/chat-intent.test.ts` — 50+ adversarial prompts
- `tests/integration/uj-05-chat-refinement.test.ts`
- `tests/perf/phase-8-chat-latency.test.ts`
- `npm run test:phase-0-8`

## Readiness for Phase 9

- Preview state + chat history ready for approval workflow
- Apply/version/rollback can gate on explicit merchant approve
