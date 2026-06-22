# Theme LLM Map

The **Theme LLM Map** (`docs/theme-llm-map.json`) is a machine-readable catalog of the Horizon Pro base theme. It gives AI agents full context for generating beautiful, valid homepage layouts: design tokens, typed section settings, block schemas, and landing page recipes.

## Regenerate

Whenever `base theme/` changes (theme update, new sections):

```bash
npm run generate:theme-map
```

This writes both:

- `docs/theme-llm-map.json` — rich LLM catalog
- `docs/theme-blueprint-manifest.json` — slim PRD blueprint manifest for validation

Blueprint manifest only:

```bash
npm run generate:blueprint-manifest
```

## Structure

| Key | Description |
|-----|-------------|
| `meta` | Theme name, version, generation timestamp, section/block counts |
| `designTokens` | Colors (schemes), typography, buttons, cards, spacing, radius |
| `sections` | All 167 section types with typed settings, blocks, presets, forge slots |
| `blocks` | All 130 standalone theme block types |
| `landingPageCatalog` | Homepage-eligible sections with `category`, `purpose`, `recommendedPosition` |
| `landingPageRecipes` | Preset-driven section order templates (`editorial-dtc`, `high-converting`, `minimal`, `fashion-editorial`) |
| `referenceHomepage` | Current `templates/index.json` from the base theme |

## Design tokens

`designTokens` maps semantic roles to current values from `settings_data.json`:

- **Colors** — `scheme-1.primary`, `primary_button_background`, rgba borders, etc.
- **Typography** — font families (Lato, Poppins, Playfair) and heading scale (h2: 36px, h3: 24px)
- **Buttons** — shape (`soft`), radius (8px), primary/secondary button colors
- **Cards** — gap, shadow, `card-2` palette

## Section settings

Each section entry includes settings with:

- `id`, `type`, `label`, `default`
- `min` / `max` / `unit` for range settings
- `role` — inferred semantic role (`headline`, `cta`, `button_background`, `image`, etc.)

Example: `editorial-hero` has `heading` (text/headline), `button_bg` (color/button_background), `min_height` (range 300–900px/size).

## LLM prompt usage

For token-efficient prompts, use `getLlmPromptContext()` from `@theme-editor/shared`:

```typescript
import { loadLlmThemeMap, getLlmPromptContext, formatLlmPromptContextForSystem } from "@theme-editor/shared";

const map = loadLlmThemeMap();
const context = getLlmPromptContext(map, "fashion", { maxCatalogSections: 40 });
const systemPrompt = formatLlmPromptContextForSystem(context);
```

This returns design tokens, a matching recipe, and a condensed section catalog (~8–15 KB) instead of the full ~650 KB file.

## Consumers

- **Layout agent** (`packages/api/src/agents/layout.agent.ts`) — section order from recipes + catalog
- **MVP AI server** (`mvp/app/services/ai.server.ts`) — Horizon Pro section types and setting IDs in layout generation prompts

## Relationship to ThemeBlueprint

The slim `ThemeBlueprint` (stored per project in the database) remains unchanged for validation gates. The LLM map is a separate, richer artifact for generative AI context.

## Blueprint manifest

`docs/theme-blueprint-manifest.json` wraps the PRD `ThemeBlueprint` with metadata and a pointer to the LLM map:

```typescript
import {
  loadBlueprintManifest,
  loadBlueprintFromManifest,
  tryLoadBlueprintFromManifest,
} from "@theme-editor/shared";

const { blueprint, llmMapPath } = loadBlueprintManifest();
```

Use the manifest when `base theme/` is unavailable (deployed API) or for fast allowlist checks without parsing Liquid files.
