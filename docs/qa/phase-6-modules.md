## Phase 6 Module Status

- [x] Preview dashboard route with gated polling
- [x] Project list page + nav link
- [x] Preview API with URLs + metadata
- [x] List API scoped by shop tenant header
- [x] UJ-03 API journey (Playwright + integration)

## Subtasks

- [x] **6.1** Preview route `/app/projects/:id/preview` | `PreviewDashboard.tsx`
- [x] **6.2** Project list `/app/projects` | `app.projects._index.tsx`
- [x] **6.3** Real preview payload | `projects.service.ts`, `preview-url.ts`
- [x] **6.4** Preview gated until validation passes | `PreviewDashboard.tsx`
- [x] **6.5** E2E UJ-03 API journey | `e2e/uj-03-preview-journey.spec.ts`

## Deferred to Phase 7+

- Inline text/image/color editing on preview
- Full embedded UI Playwright (requires dev store tunnel)
- Apply / chat actions
