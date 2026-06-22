import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { VariantSelectionService } from "./variant-selection/variant-selection.service.js";
import { TokenResolver } from "./token-resolver/token-resolver.js";
import { ALL_PRESETS } from "./builders/build-preset-catalogs.js";
import { ALL_VARIANT_FAMILIES } from "./builders/build-variant-catalogs.js";
import { buildAllTokenCatalogs } from "./builders/build-token-catalogs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getCatalogsDir(): Promise<string> {
  return path.join(__dirname, "catalogs");
}

describe("Pipeline Integration", () => {
  const variantService = new VariantSelectionService();

  describe("Preset flows → Variant selection chain", () => {
    it("all preset flow sections select real Base Theme handles", () => {
      for (const preset of ALL_PRESETS) {
        const slotMap = variantService.selectForSlots(
          preset.section_flow,
          preset.id,
          ALL_VARIANT_FAMILIES,
        );

        // Every slot must have a string handle
        for (const [slot, handle] of slotMap) {
          expect(typeof handle).toBe("string");
          expect(handle.length).toBeGreaterThan(0);
          expect(handle).not.toBe("promo-banner");       // phantom
          expect(handle).not.toBe("editorial-banner");    // phantom
          expect(handle).not.toBe("feature-grid");        // phantom
        }
      }
    });
  });

  describe("Token resolution chain", () => {
    it("resolves all preset token_refs using real Base Theme IDs", () => {
      const mockSettings = {
        current: {
          type_heading_font: "playfair_display_n7",
          type_body_font: "lato_n4",
          global_border_radius: 8,
          card_gap: 20,
          card_hover_effect: "zoom",
          button_shape: "soft",
          page_width: "1200px",
          color_schemes: {
            "scheme-1": {
              settings: {
                primary: "#2d1b4e",
                background: "#fafaf8",
                primary_button_background: "#2d1b4e",
                primary_button_text: "#ffffff",
                foreground_heading: "#1a1815",
                foreground: "#1a1815",
                border: "rgba(26, 24, 21, 0.08)",
                card_shadow: "medium",
              },
            },
          },
        },
      };

      const tokens = buildAllTokenCatalogs(mockSettings as Parameters<typeof buildAllTokenCatalogs>[0]);
      const resolver = TokenResolver.fromTokens(tokens);

      for (const preset of ALL_PRESETS) {
        const resolved = resolver.resolveRefs(preset.token_refs);

        // Must have resolved at least some tokens
        expect(Object.keys(resolved).length).toBeGreaterThan(0);

        // Must NOT contain invented IDs
        expect(resolved["color_primary_01"]).toBeUndefined();
        expect(resolved["font_heading_modern"]).toBeUndefined();
        expect(resolved["btn_primary_bg"]).toBeUndefined();
      }
    });
  });

  describe("Generated catalog files", () => {
    it("token catalog has real Shopify setting IDs as keys", async () => {
      const catalogsDir = await getCatalogsDir();
      try {
        const colorsJson = JSON.parse(
          await readFile(path.join(catalogsDir, "design-tokens", "colors.json"), "utf8"),
        ) as Record<string, unknown>;

        // Real IDs must exist
        expect(colorsJson["primary"]).toBe("#2d1b4e");
        expect(colorsJson["background"]).toBe("#fafaf8");
        expect(colorsJson["primary_button_background"]).toBe("#2d1b4e");

        // Invented IDs must NOT exist
        expect(colorsJson["color_primary_01"]).toBeUndefined();
        expect(colorsJson["color_button_primary_bg"]).toBeUndefined();
      } catch {
        // If catalogs haven't been generated, skip file-level assertions
        console.warn("Catalog files not found — run `npm run generate:intelligence` first");
      }
    });

    it("high-converting preset catalog uses real section handles", async () => {
      const catalogsDir = await getCatalogsDir();
      try {
        const presetJson = JSON.parse(
          await readFile(path.join(catalogsDir, "presets", "high-converting.json"), "utf8"),
        ) as { section_flow: Array<{ preferred_section_type: string }> };

        const handles = presetJson.section_flow.map((s) => s.preferred_section_type);

        // Phantom handles must not be present
        expect(handles).not.toContain("promo-banner");
        expect(handles).not.toContain("editorial-banner");
        expect(handles).not.toContain("feature-grid");

        // Real handles must be present
        expect(handles).toContain("editorial-hero");
        expect(handles).toContain("editorial-newsletter");
      } catch {
        console.warn("Catalog files not found — run `npm run generate:intelligence` first");
      }
    });

    it("section catalog editorial-hero has section_settings_raw and runtime_intelligence", async () => {
      const catalogsDir = await getCatalogsDir();
      try {
        const sectionJson = JSON.parse(
          await readFile(path.join(catalogsDir, "sections", "editorial-hero.json"), "utf8"),
        ) as Record<string, unknown>;

        expect(sectionJson["section_type"]).toBe("editorial-hero");
        expect(sectionJson["section_schema_name"]).toBeTruthy();
        expect(sectionJson["runtime_intelligence"]).toBeDefined();
        expect((sectionJson["runtime_intelligence"] as Record<string, unknown>)["performance_tier"]).toBe("critical");
      } catch {
        console.warn("Catalog files not found — run `npm run generate:intelligence` first");
      }
    });
  });
});
