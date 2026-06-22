import { describe, it, expect } from "vitest";

import { ALL_PRESETS, HIGH_CONVERTING_PRESET, FASHION_PRESET, MINIMAL_MODERN_PRESET } from "./build-preset-catalogs.js";

// Known Base Theme section handles for validation
const BASE_THEME_HANDLES = new Set([
  "editorial-hero", "hero-split", "hero-wave", "media-slideshow-banner", "premium-hero-banner",
  "editorial-collection-grid", "featured-product-grid-v2", "bestsellers-row", "collection-showcase-v2",
  "ai-featured-products-grid", "editorial-testimonials", "customer-reviews-v2", "testimonials-slider",
  "editorial-ugc-strip", "faq-v2", "faq-v3", "faq-product", "editorial-trust-bar", "trust-badges-v4",
  "trust-icons-row", "editorial-newsletter", "newsletter-signup", "newsletter-signup-v2",
  "brand-story", "editorial-brand-story", "product-storytelling-v2", "editorial-promo-banner",
  "benefits", "benefits-swap", "editorial-marquee",
]);

const PHANTOM_HANDLES = ["promo-banner", "editorial-banner", "feature-grid"];

describe("build-preset-catalogs", () => {
  describe("HIGH_CONVERTING preset", () => {
    it("has no phantom section handles", () => {
      for (const slot of HIGH_CONVERTING_PRESET.section_flow) {
        expect(PHANTOM_HANDLES).not.toContain(slot.preferred_section_type);
      }
    });

    it("all preferred_section_type values are Base Theme handles", () => {
      for (const slot of HIGH_CONVERTING_PRESET.section_flow) {
        expect(BASE_THEME_HANDLES.has(slot.preferred_section_type)).toBe(true);
      }
    });

    it("uses real Base Theme token IDs — no invented names", () => {
      const allTokenIds = [
        ...HIGH_CONVERTING_PRESET.token_refs.colors,
        ...HIGH_CONVERTING_PRESET.token_refs.typography,
        ...HIGH_CONVERTING_PRESET.token_refs.buttons,
      ];

      // Invented IDs must not be present
      expect(allTokenIds).not.toContain("color_primary_01");
      expect(allTokenIds).not.toContain("font_heading_modern");
      expect(allTokenIds).not.toContain("btn_primary_bg");
      expect(allTokenIds).not.toContain("color_button_primary_bg");

      // Real IDs must be present
      expect(allTokenIds).toContain("primary");
      expect(allTokenIds).toContain("type_heading_font");
    });

    it("has slot 1 as editorial-hero (hero family)", () => {
      const slot1 = HIGH_CONVERTING_PRESET.section_flow[0];
      expect(slot1?.section_family).toBe("hero");
      expect(slot1?.preferred_section_type).toBe("editorial-hero");
      expect(slot1?.required).toBe(true);
    });

    it("does NOT have promo-banner as a required slot", () => {
      const required = HIGH_CONVERTING_PRESET.section_flow.filter((s) => s.required);
      const requiredHandles = required.map((s) => s.preferred_section_type);
      expect(requiredHandles).not.toContain("promo-banner");
    });

    it("has copy_intelligence field with content", () => {
      expect(HIGH_CONVERTING_PRESET.copy_intelligence.headline_style).toBeTruthy();
      expect(HIGH_CONVERTING_PRESET.copy_intelligence.cta_style).toBeTruthy();
    });
  });

  describe("FASHION preset", () => {
    it("uses editorial-promo-banner (not promo-banner)", () => {
      const handles = FASHION_PRESET.section_flow.map((s) => s.preferred_section_type);
      expect(handles).not.toContain("promo-banner");
      expect(handles).toContain("editorial-promo-banner");
    });

    it("uses collection-showcase-v2 (not invented handle)", () => {
      const handles = FASHION_PRESET.section_flow.map((s) => s.preferred_section_type);
      expect(handles).toContain("collection-showcase-v2");
    });

    it("has urgency_style as null (no pressure tactics)", () => {
      expect(FASHION_PRESET.copy_intelligence.urgency_style).toBeNull();
    });
  });

  describe("MINIMAL MODERN preset", () => {
    it("has 5 required sections", () => {
      const required = MINIMAL_MODERN_PRESET.section_flow.filter((s) => s.required);
      expect(required.length).toBe(5);
    });

    it("does not use urgency family", () => {
      const families = MINIMAL_MODERN_PRESET.section_flow.map((s) => s.section_family);
      expect(families).not.toContain("urgency");
    });
  });

  describe("ALL_PRESETS", () => {
    it("contains exactly 3 presets", () => {
      expect(ALL_PRESETS.length).toBe(3);
    });

    it("every preset has preferred_variant as optional (not required)", () => {
      for (const preset of ALL_PRESETS) {
        for (const slot of preset.section_flow) {
          // preferred_variant can be undefined — it's no longer required
          expect(typeof slot.preferred_variant === "string" || slot.preferred_variant === undefined).toBe(true);
        }
      }
    });
  });
});
