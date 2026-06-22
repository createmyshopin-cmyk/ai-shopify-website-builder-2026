import { describe, it, expect } from "vitest";

import { SectionSelectionService, InsufficientSectionsError } from "./section-selection.service.js";
import { HIGH_CONVERTING_PRESET, FASHION_PRESET, MINIMAL_MODERN_PRESET } from "../builders/build-preset-catalogs.js";
import type { SectionCatalog } from "../types/catalog-types.js";

function mockSection(
  sectionType: string,
  family: string,
  priority: number,
  required: boolean,
  hc: number,
  fa: number,
  mm: number,
): SectionCatalog {
  return {
    section_id: sectionType,
    section_type: sectionType,
    section_category: "hero",
    section_role: "hero",
    section_family: family as SectionCatalog["section_family"],
    priority_score: priority,
    required,
    purpose: "Test section",
    metadata: {
      identity: { merchant_goal: "Test", conversion_goal: "Awareness" },
      layout: { desktop_layout: "full-width", tablet_layout: "full-width", mobile_layout: "full-width", alignment_rules: "center", content_hierarchy: "headline-first" },
      spacing: { section_padding_top: 60, section_padding_bottom: 60, block_spacing: 20, grid_spacing: 20, image_spacing: 16 },
      typography: { heading_font: "font_heading_modern", subheading_font: "font_subheading", body_font: "font_body_clean", heading_size: "type_scale_h1", subheading_size: "type_scale_h3", body_size: "type_scale_body", font_weight: "700", line_height: "line_height_normal", letter_spacing: "letter_spacing_normal" },
      colorSystem: { background_color: "#fff", text_color: "#000", heading_color: "#000", secondary_text_color: "#666", accent_color: "#2d1b4e", border_color: "rgba(0,0,0,0.1)" },
      buttons: { primary_button_color: "#2d1b4e", primary_button_text_color: "#fff", secondary_button_color: "#6b6460" },
      cards: { border_radius: 8, shadow_style: "medium", elevation: "default", hover_effect: "lift" },
      animation: { reveal_animation: "fade-in", hover_animation: "lift", transition_duration: 300 },
      image: { image_ratio: "16/9", image_shape: "rounded", image_treatment: "none" },
      commerce: { product_card_style: "default", price_style: "bold", badge_style: "pill", discount_style: "percentage", add_to_cart_style: "button" },
      trust: { ratings: false, reviews: false, trust_badges: false, guarantees: false },
      seo: { semantic_role: "banner", heading_hierarchy: "h1", accessibility_rules: "landmark-banner" },
    },
    compatibility_scores: { high_converting: hc, fashion: fa, minimal_modern: mm },
    token_refs: { colors: [], typography: [], spacing: [], radius: [], shadows: [], buttons: [], animations: [] },
    flow_rules: { allowed_before: [], allowed_after: [], recommended_before: [], recommended_after: [] },
  };
}

describe("SectionSelectionService", () => {
  const service = new SectionSelectionService();

  const mockSections: SectionCatalog[] = [
    mockSection("editorial-hero",          "hero",         100, true,  95, 90, 85),
    mockSection("editorial-collection-grid","products",    85,  false, 85, 70, 80),
    mockSection("benefits",                "content",      70,  false, 65, 60, 75),
    mockSection("featured-product-grid-v2","products",    88,  false, 85, 70, 80),
    mockSection("editorial-testimonials",  "social_proof", 82,  false, 80, 75, 50),
    mockSection("editorial-trust-bar",     "trust",        90,  false, 95, 60, 40),
    mockSection("faq-v2",                  "faq",          60,  false, 70, 45, 80),
    mockSection("editorial-newsletter",    "lead_capture", 80,  false, 80, 65, 65),
  ];

  describe("high-converting preset", () => {
    it("selects at least 8 required sections", () => {
      const selected = service.selectSections(HIGH_CONVERTING_PRESET, mockSections);
      expect(selected.length).toBeGreaterThanOrEqual(8);
    });

    it("all required sections are included", () => {
      const selected = service.selectSections(HIGH_CONVERTING_PRESET, mockSections);
      const requiredSelected = selected.filter((s) => s.required);
      expect(requiredSelected.length).toBe(8);
    });

    it("editorial-hero is always selected (required)", () => {
      const selected = service.selectSections(HIGH_CONVERTING_PRESET, mockSections);
      expect(selected.some((s) => s.section_type === "editorial-hero")).toBe(true);
    });
  });

  describe("section priority", () => {
    it("required sections are always included regardless of score", () => {
      const lowScoreHero = mockSection("editorial-hero", "hero", 100, true, 10, 10, 10);
      const sections = [lowScoreHero, ...mockSections.slice(1)];
      const selected = service.selectSections(HIGH_CONVERTING_PRESET, sections);
      expect(selected.some((s) => s.section_type === "editorial-hero")).toBe(true);
    });
  });

  describe("InsufficientSectionsError", () => {
    it("still selects required sections from preset flow even with no available catalog sections", () => {
      // The preset flow defines required slots deterministically, so selection always produces
      // the required sections even when no catalog sections match
      const selected = service.selectSections(HIGH_CONVERTING_PRESET, []);
      expect(selected.length).toBeGreaterThanOrEqual(8);
    });

    it("InsufficientSectionsError is exported", () => {
      expect(InsufficientSectionsError).toBeDefined();
    });
  });

  describe("fashion preset", () => {
    it("selects at least 6 sections", () => {
      const fashionSections: SectionCatalog[] = [
        mockSection("editorial-hero",          "hero",         100, true,  90, 90, 85),
        mockSection("editorial-banner",        "storytelling", 75,  false, 40, 100, 50),
        mockSection("collection-showcase-v2",  "products",     80,  false, 70, 70, 50),
        mockSection("brand-story",             "storytelling", 70,  false, 40, 100, 50),
        mockSection("editorial-ugc-strip",     "social_proof", 75,  false, 75, 75, 50),
        mockSection("editorial-newsletter",    "footer",       80,  false, 80, 80, 80),
      ];
      const selected = service.selectSections(FASHION_PRESET, fashionSections);
      expect(selected.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("minimal-modern preset", () => {
    it("selects at least 5 sections", () => {
      const mmSections: SectionCatalog[] = [
        mockSection("editorial-hero",           "hero",     100, true, 85, 90, 85),
        mockSection("featured-product-grid-v2", "products", 85,  false, 80, 60, 80),
        mockSection("feature-grid",             "content",  70,  false, 60, 50, 75),
        mockSection("faq-v2",                   "faq",      60,  false, 65, 40, 80),
        mockSection("editorial-newsletter",     "footer",   80,  false, 75, 80, 75),
      ];
      const selected = service.selectSections(MINIMAL_MODERN_PRESET, mmSections);
      expect(selected.length).toBeGreaterThanOrEqual(5);
    });
  });
});
