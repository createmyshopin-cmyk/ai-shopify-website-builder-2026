## Phase 3 Module Status

- [x] Six AI agents (Vision, Copy, Image, Layout, Compiler, Validation)
- [x] Synchronous pipeline service with PRD job order
- [x] `POST /api/projects/run/:id` API
- [x] MVP styles page triggers pipeline after initiate
- [x] Golden fixtures + validation unit tests
- [x] `agentOutputs` JSON on `design_projects`

## Subtasks

- [x] **3.1** Shared agent output Zod schemas | `packages/shared/src/agents/types.ts`
- [x] **3.2** OpenRouter client + MOCK_AI mode | `packages/api/src/agents/openrouter.client.ts`
- [x] **3.3** Vision, Copy, Image, Layout agents | `packages/api/src/agents/*.agent.ts`
- [x] **3.4** Compiler + Validation agents | `compiler.agent.ts`, `validation.agent.ts`
- [x] **3.5** Sync pipeline + job status updates | `pipeline.service.ts`
- [x] **3.6** API route + UI wire-up | `agents.controller.ts`, `app.styles.tsx`
- [x] **3.7** Golden tests | `golden.test.ts`, `validation.agent.test.ts`

## Deferred to Phase 4–5

- BullMQ async workers
- Real image generation (Image agent uses planned assets + placeholders)
- UPLOAD job (marked SKIPPED)
- Theme file upload to draft theme
