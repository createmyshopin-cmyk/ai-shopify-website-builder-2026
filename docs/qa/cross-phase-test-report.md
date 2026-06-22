# Cross-Phase Test Report (Phases 0–10)

**Date:** 2026-06-22  
**Command:** `npm run test:phase-0-10:auto`  
**Result:** All automated checks **PASS**

## Summary

| Suite | Tests | Status |
|-------|------:|--------|
| Unit (`test:unit`) | 115 | PASS |
| Integration (`test:integration`) | 31 | PASS |
| Cross-phase smoke (`test:cross-phase`) | 31 | PASS |
| Perf (`test:perf`) | 6 | PASS |
| Playwright E2E (`test:e2e`) | 2 (+1 skipped live) | PASS |
| Live API E2E (`test:phase-0-10:live`) | 12 | PASS |
| Stack + security audits | — | PASS |
| MVP lint (0 errors) + build + client secret scan | — | PASS |

## Fixes applied (this run)

- Playwright harness: removed `import.meta` (ESM load error)
- Lint: merged `react-router` imports; fixed hook deps in `ProductPickerModal`
- Added `scripts/phase-0-10-live.mjs` — full live API journey 0–10
- `test:phase-0-10:auto` now includes `test:e2e` + `test:phase-0-10:live`

## Run again

```powershell
# Terminal 1 — API (must be running for live E2E)
npm run dev:api:stable

# Terminal 2 — full gate (~10 min)
npm run test:phase-0-10:auto
```

## Production checklist (manual)

- Set `MOCK_AI=false`, `MOCK_SHOPIFY_UPLOAD=false` in production
- Deploy API (`docker compose -f docker-compose.prod.yml up -d --build`)
- Update `shopify.app.toml` URLs → `shopify app deploy`
- Run on dev store without mocks before App Store submit
