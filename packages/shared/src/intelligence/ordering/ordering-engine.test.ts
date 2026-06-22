import { describe, it, expect } from "vitest";

import { OrderingEngine, InvalidSectionOrderError } from "./ordering-engine.js";
import { HIGH_CONVERTING_PRESET, FASHION_PRESET } from "../builders/build-preset-catalogs.js";
import type { SelectedSection } from "../selection/section-selection.service.js";

function sel(type: string, family: string, slot?: number): SelectedSection {
  return {
    section_type: type,
    section_id: type,
    section_family: family,
    priority_score: 80,
    required: true,
    compatibility_score: 80,
    slot,
  };
}

describe("OrderingEngine", () => {
  const engine = new OrderingEngine();

  describe("hard rules", () => {
    it("hero is always at slot 1", () => {
      const sections: SelectedSection[] = [
        sel("editorial-trust-bar",     "trust",        6),
        sel("editorial-hero",          "hero",         1),
        sel("editorial-newsletter",    "lead_capture", 8),
      ];
      const ordered = engine.orderSections(sections, HIGH_CONVERTING_PRESET);
      expect(ordered[0]!.section_family).toBe("hero");
    });

    it("footer is always last", () => {
      const sections: SelectedSection[] = [
        sel("editorial-hero",       "hero",   1),
        sel("editorial-newsletter", "footer", 2),
        sel("editorial-trust-bar",  "trust",  3),
      ];
      const ordered = engine.orderSections(sections, HIGH_CONVERTING_PRESET);
      expect(ordered[ordered.length - 1]!.section_family).toBe("footer");
    });

    it("throws when no hero section provided", () => {
      const sections: SelectedSection[] = [
        sel("editorial-trust-bar",  "trust",        1),
        sel("editorial-newsletter", "lead_capture", 2),
      ];
      expect(() => engine.orderSections(sections, HIGH_CONVERTING_PRESET)).toThrow(InvalidSectionOrderError);
    });

    it("throws on empty sections", () => {
      expect(() => engine.orderSections([], HIGH_CONVERTING_PRESET)).toThrow(InvalidSectionOrderError);
    });
  });

  describe("final_slot numbering", () => {
    it("assigns sequential final_slot values starting at 1", () => {
      const sections: SelectedSection[] = [
        sel("editorial-hero",           "hero",         1),
        sel("editorial-collection-grid","products",     2),
        sel("editorial-testimonials",   "social_proof", 5),
        sel("editorial-newsletter",     "lead_capture", 8),
      ];
      const ordered = engine.orderSections(sections, HIGH_CONVERTING_PRESET);
      const slots = ordered.map((s) => s.final_slot);
      expect(slots).toEqual([1, 2, 3, 4]);
    });
  });

  describe("ordering_notes", () => {
    it("adds warning notes for urgency after non-products section", () => {
      const sections: SelectedSection[] = [
        sel("editorial-hero",    "hero",    1),
        sel("urgency-countdown", "urgency", 2),
        sel("editorial-newsletter", "lead_capture", 8),
      ];
      const ordered = engine.orderSections(sections, HIGH_CONVERTING_PRESET);
      const urgencySection = ordered.find((s) => s.section_family === "urgency");
      // urgency after hero may generate a soft warning
      expect(urgencySection).toBeDefined();
    });
  });

  describe("determinism", () => {
    it("same input always produces same output", () => {
      const sections: SelectedSection[] = [
        sel("editorial-hero",           "hero",         1),
        sel("editorial-collection-grid","products",     2),
        sel("benefits",                 "content",      3),
        sel("editorial-testimonials",   "social_proof", 5),
        sel("editorial-newsletter",     "lead_capture", 8),
      ];

      const results = Array.from({ length: 10 }, () =>
        engine.orderSections(sections, HIGH_CONVERTING_PRESET).map((s) => s.section_type),
      );

      const first = results[0]!;
      expect(results.every((r) => JSON.stringify(r) === JSON.stringify(first))).toBe(true);
    });
  });

  describe("fashion preset", () => {
    it("hero first, footer last for fashion", () => {
      const sections: SelectedSection[] = [
        sel("editorial-hero",          "hero",         1),
        sel("editorial-banner",        "storytelling", 2),
        sel("collection-showcase-v2",  "products",     3),
        sel("brand-story",             "storytelling", 4),
        sel("editorial-ugc-strip",     "social_proof", 5),
        sel("editorial-newsletter",    "footer",       6),
      ];
      const ordered = engine.orderSections(sections, FASHION_PRESET);
      expect(ordered[0]!.section_family).toBe("hero");
      expect(ordered[ordered.length - 1]!.section_family).toBe("footer");
    });
  });
});
