import { describe, it, expect } from "vitest";

import { VariantSelectionService } from "./variant-selection.service.js";
import { ALL_VARIANT_FAMILIES } from "../builders/build-variant-catalogs.js";

const BASE_THEME_HANDLES = new Set([
  "editorial-hero", "hero-split", "hero-wave", "media-slideshow-banner", "premium-hero-banner",
  "featured-product-grid-v2", "editorial-collection-grid", "bestsellers-row", "collection-showcase-v2",
  "editorial-testimonials", "customer-reviews-v2", "testimonials-slider", "editorial-ugc-strip",
  "faq-v2", "faq-v3", "editorial-trust-bar", "trust-badges-v4", "trust-icons-row",
  "editorial-newsletter", "newsletter-signup", "brand-story", "editorial-brand-story",
  "benefits", "benefits-swap", "editorial-marquee",
]);

describe("VariantSelectionService", () => {
  const service = new VariantSelectionService();

  describe("selectSectionForFamily", () => {
    it("returns a real Base Theme handle for hero + high-converting", () => {
      const result = service.selectSectionForFamily("hero", "high-converting", ALL_VARIANT_FAMILIES);
      expect(result).toBeDefined();
      expect(BASE_THEME_HANDLES.has(result!)).toBe(true);
    });

    it("returns editorial-hero for hero + high-converting (highest score)", () => {
      const result = service.selectSectionForFamily("hero", "high-converting", ALL_VARIANT_FAMILIES);
      expect(result).toBe("editorial-hero");
    });

    it("returns a real Base Theme handle for hero + fashion", () => {
      const result = service.selectSectionForFamily("hero", "fashion", ALL_VARIANT_FAMILIES);
      expect(result).toBeDefined();
      expect(BASE_THEME_HANDLES.has(result!)).toBe(true);
    });

    it("returns editorial-hero for hero + fashion (also highest score)", () => {
      const result = service.selectSectionForFamily("hero", "fashion", ALL_VARIANT_FAMILIES);
      expect(result).toBe("editorial-hero");
    });

    it("returns editorial-testimonials for social_proof + high-converting", () => {
      const result = service.selectSectionForFamily("social_proof", "high-converting", ALL_VARIANT_FAMILIES);
      expect(result).toBe("editorial-testimonials");
    });

    it("returns collection-showcase-v2 for products + fashion (highest fashion score)", () => {
      const result = service.selectSectionForFamily("products", "fashion", ALL_VARIANT_FAMILIES);
      expect(result).toBe("collection-showcase-v2");
    });

    it("returns undefined for unknown family", () => {
      const result = service.selectSectionForFamily("unknown-family", "high-converting", ALL_VARIANT_FAMILIES);
      expect(result).toBeUndefined();
    });

    it("is deterministic — same inputs always produce same output", () => {
      const r1 = service.selectSectionForFamily("hero", "minimal-modern", ALL_VARIANT_FAMILIES);
      const r2 = service.selectSectionForFamily("hero", "minimal-modern", ALL_VARIANT_FAMILIES);
      expect(r1).toBe(r2);
    });
  });

  describe("selectForSlots", () => {
    it("returns a map with one entry per slot", () => {
      const slots = [
        { slot: 1, section_family: "hero" as const, preferred_section_type: "editorial-hero", required: true },
        { slot: 2, section_family: "products" as const, preferred_section_type: "featured-product-grid-v2", required: true },
      ];
      const result = service.selectForSlots(slots, "high-converting", ALL_VARIANT_FAMILIES);
      expect(result.size).toBe(2);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it("returns real Base Theme handles in all slots", () => {
      const slots = [
        { slot: 1, section_family: "hero" as const, preferred_section_type: "editorial-hero", required: true },
        { slot: 2, section_family: "faq" as const, preferred_section_type: "faq-v2", required: true },
        { slot: 3, section_family: "trust" as const, preferred_section_type: "editorial-trust-bar", required: true },
      ];
      const result = service.selectForSlots(slots, "high-converting", ALL_VARIANT_FAMILIES);
      for (const [, sectionType] of result) {
        expect(BASE_THEME_HANDLES.has(sectionType)).toBe(true);
      }
    });

    it("falls back to preferred_section_type for unknown families", () => {
      const slots = [
        { slot: 1, section_family: "footer" as const, preferred_section_type: "footer", required: true },
      ];
      const result = service.selectForSlots(slots, "high-converting", ALL_VARIANT_FAMILIES);
      // footer family has no variant catalog — falls back to preferred_section_type
      expect(result.get(1)).toBe("footer");
    });
  });
});
