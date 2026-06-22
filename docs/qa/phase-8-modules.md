# Phase 8 — Modules

## Shared

| Module | Responsibility |
|--------|----------------|
| `chat/types.ts` | Request/response Zod schemas |
| `chat/sanitize.ts` | Input + settings sanitization |
| `chat/chat-intent.ts` | Mock + LLM intent → patches |
| `chat/adversarial-fixtures.ts` | Security test catalog |

## API

| Module | Responsibility |
|--------|----------------|
| `preview-edit.service.ts` | `handleChat`, `applyPreviewPatches`, chat history |

## UI

| Module | Responsibility |
|--------|----------------|
| `ChatPanel.tsx` | Merchant chat UI on preview page |

## Deferred to Phase 9+

- Apply to live theme
- Version snapshots on chat
- Streaming LLM responses
