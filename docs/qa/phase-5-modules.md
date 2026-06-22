## Phase 5 Module Status

- [x] Deterministic theme compiler (no AI theme file writes)
- [x] Five-gate safety pipeline aligned with PRD
- [x] Production guardrails (20MB, 20MP, fonts, assets, sections)
- [x] Upload worker integrated into pipeline (mock + live paths)
- [x] Compiler + validation agents delegate to shared modules
- [x] 17+ unit tests across compiler and safety pipeline

## Subtasks

- [x] **5.1** Deterministic compiler | `packages/shared/src/compiler/`
- [x] **5.2** Safety gates JSON→Schema→Asset→Section→Theme | `safety-pipeline.ts`
- [x] **5.3** Guardrails (20MB/20MP, fonts, missing assets) | `safety-pipeline.ts`
- [x] **5.4** Upload processor → draft theme | `upload.processor.ts`, `theme-api.ts`
- [x] **5.5** Validation agent uses safety pipeline | `validation.agent.ts`
- [x] **5.6** Edge-case tests + snapshot regression | `compile-theme.test.ts`, `safety-pipeline.test.ts`

## Deferred to Phase 6+

- Preview URL wiring in embedded app dashboard
- Binary asset upload to theme `assets/` (images still placeholder URLs)
- Full E2E against live Shopify draft theme in CI
