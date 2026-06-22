## Phase 2 Module Status

- [x] All subtasks (2.1–2.6) core implementation DONE
- [x] Base theme blueprint from local `base theme/` (Horizon Pro)
- [x] Blueprint persisted on `design_projects.blueprint`; status `BLUEPRINT_READY`
- [x] Optional draft theme provisioning via Shopify `themeDuplicate`
- [x] Tests green (unit 7 / integration 2+3 skipped without DATABASE_URL)
- [x] Phase record and sign-off below

## Subtasks

- [x] **2.1** Shared — `ThemeBlueprint` Zod schema (PRD JSON shape) | Evidence: `packages/shared/src/blueprint/types.ts`
- [x] **2.2** Shared — Parse `{% schema %}` from section/block `.liquid` | Evidence: `parse-section-schema.ts`
- [x] **2.3** Shared — Read local theme (`settings_data`, `index.json`, CSS vars) | Evidence: `local-theme-reader.ts`
- [x] **2.4** Shared — Build blueprint from theme files | Evidence: `build-blueprint.ts`, `build-blueprint.test.ts`
- [x] **2.5** API — Blueprint service + initiate hook; DB migration | Evidence: `blueprint.service.ts`, migration `20250621130000_add_project_blueprint`
- [x] **2.6** Shopify — Draft theme client with PRD retry backoff | Evidence: `shopify/theme-api.ts`, `utils/retry.ts`

## PRD sections (Phase 2)

- [x] PRD-001 — Base Theme First (local `base theme/` as canonical source)
- [x] Base Theme Blueprint Engine — sections, blocks, fonts, colors, css_variables, settings, spacing_rules, radius_rules
- [x] Draft theme duplication on initiate when `accessToken` provided
- [x] `templateSectionOrder` from `templates/index.json`

## Blueprint metrics (Horizon Pro v2.7.0)

| Field | Count |
|-------|------:|
| sections | 167 |
| blocks | 130 |
| fonts | 7 |
| colors | 11 |
| css_variables | 409 |
