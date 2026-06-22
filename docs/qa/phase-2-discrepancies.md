# Phase 2 Discrepancies

| Item | PRD / plan | Actual | Risk | Follow-up |
|------|------------|--------|------|-----------|
| Blueprint source | Shopify live theme | Local `base theme/` folder (Horizon Pro) | Low | Phase 5 compiler may sync files to draft theme |
| Draft theme | Always provision | Only when `accessToken` sent on initiate | Low | MVP passes token from embedded session |
| `themeDuplicate` integration test | Live shop | Unit-tested client only; no live GraphQL in CI | Medium | Add sandbox E2E in Phase 9 |
| Blueprint from main theme vs base | Duplicate main then analyze | Blueprint always from `BASE_THEME_PATH`; duplicate is separate | Low | Aligns with PRD "Base Theme First" |
| `findRepoRoot` | — | Walks up to workspace `package.json` | Low | Set `REPO_ROOT` in API `.env` if cwd differs |
