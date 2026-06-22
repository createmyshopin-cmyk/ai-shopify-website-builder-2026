import { describe, it, expect } from "vitest";

import { HIGH_CONVERTING_PRESET, FASHION_PRESET, MINIMAL_MODERN_PRESET, ALL_PRESETS } from "./build-preset-catalogs.js";
import { ALL_VARIANT_FAMILIES, buildVariantFamilyCatalogs } from "./build-variant-catalogs.js";
import { buildAllRelationshipFlows } from "./build-relationship-graph.js";

describe("Preset Catalog", () => {
  it("has exactly 3 presets", () => {
    expect(ALL_PRESETS).toHaveLength(3);
  });

  describe("high-converting", () => {
    it("has min=8 max=10", () => {
      expect(HIGH_CONVERTING_PRESET.section_count_rules.min_sections).toBe(8);
      expect(HIGH_CONVERTING_PRESET.section_count_rules.max_sections).toBe(10);
    });

    it("has 8 required slots", () => {
      const required = HIGH_CONVERTING_PRESET.section_flow.filter((s) => s.required);
      expect(required).toHaveLength(8);
    });

    it("slot 1 is hero family", () => {
      expect(HIGH_CONVERTING_PRESET.section_flow[0]!.section_family).toBe("hero");
    });

    it("last required slot is lead_capture", () => {
      const required = HIGH_CONVERTING_PRESET.section_flow.filter((s) => s.required);
      expect(required[required.length - 1]!.section_family).toBe("lead_capture");
    });

    it("spacing_scale is compact", () => {
      expect(HIGH_CONVERTING_PRESET.characteristics.spacing_scale).toBe("compact");
    });

    it("excludes navigation family", () => {
      expect(HIGH_CONVERTING_PRESET.excluded_section_families).toContain("navigation");
    });
  });

  describe("fashion", () => {
    it("has min=6 max=8", () => {
      expect(FASHION_PRESET.section_count_rules.min_sections).toBe(6);
      expect(FASHION_PRESET.section_count_rules.max_sections).toBe(8);
    });

    it("spacing_scale is airy", () => {
      expect(FASHION_PRESET.characteristics.spacing_scale).toBe("airy");
    });

    it("animation is expressive", () => {
      expect(FASHION_PRESET.characteristics.animation_intensity).toBe("expressive");
    });

    it("excludes urgency family", () => {
      expect(FASHION_PRESET.excluded_section_families).toContain("urgency");
    });
  });

  describe("minimal-modern", () => {
    it("has min=5 max=6", () => {
      expect(MINIMAL_MODERN_PRESET.section_count_rules.min_sections).toBe(5);
      expect(MINIMAL_MODERN_PRESET.section_count_rules.max_sections).toBe(6);
    });

    it("animation is none", () => {
      expect(MINIMAL_MODERN_PRESET.characteristics.animation_intensity).toBe("none");
    });

    it("has 5 required slots", () => {
      const required = MINIMAL_MODERN_PRESET.section_flow.filter((s) => s.required);
      expect(required).toHaveLength(5);
    });
  });
});

describe("Variant Catalog (VariantFamilyCatalog model)", () => {
  // New model: variants are Base Theme section handles grouped by semantic family.
  const families = buildVariantFamilyCatalogs();

  it("has a hero family", () => {
    const hero = families.find((f) => f.family === "hero");
    expect(hero).toBeDefined();
    expect(hero!.sections.length).toBeGreaterThanOrEqual(3);
  });

  it("hero family contains editorial-hero (the real Base Theme handle)", () => {
    const hero = families.find((f) => f.family === "hero")!;
    const found = hero.sections.find((s) => s.section_type === "editorial-hero");
    expect(found).toBeDefined();
  });

  it("hero-split is in the hero family with the correct Base Theme handle", () => {
    const hero = families.find((f) => f.family === "hero")!;
    const split = hero.sections.find((s) => s.section_type === "hero-split");
    expect(split).toBeDefined();
    // minimal-modern scores higher for hero-split than high-converting
    expect(split!.preset_scores["minimal-modern"]).toBeGreaterThan(
      split!.preset_scores["high-converting"]!,
    );
  });

  it("fashion scores highest for editorial-ugc-strip in social_proof family", () => {
    const spFamily = families.find((f) => f.family === "social_proof")!;
    const ugc = spFamily.sections.find((s) => s.section_type === "editorial-ugc-strip");
    expect(ugc).toBeDefined();
    expect(ugc!.preset_scores["fashion"]).toBeGreaterThan(ugc!.preset_scores["high-converting"]!);
  });

  it("faq family contains faq-v2 (the real Base Theme handle)", () => {
    const faqFamily = families.find((f) => f.family === "faq")!;
    expect(faqFamily).toBeDefined();
    const faqV2 = faqFamily.sections.find((s) => s.section_type === "faq-v2");
    expect(faqV2).toBeDefined();
  });

  it("social_proof family contains editorial-testimonials", () => {
    const spFamily = families.find((f) => f.family === "social_proof")!;
    const testimonials = spFamily.sections.find((s) => s.section_type === "editorial-testimonials");
    expect(testimonials).toBeDefined();
  });

  it("ALL_VARIANT_FAMILIES matches buildVariantFamilyCatalogs()", () => {
    expect(families).toEqual(ALL_VARIANT_FAMILIES);
  });
});

describe("Relationship Graph", () => {
  const flows = buildAllRelationshipFlows();

  it("has exactly 3 flows", () => {
    expect(flows).toHaveLength(3);
  });

  it("high-converting flow has 10 slots", () => {
    const hcFlow = flows.find((f) => f.preset_id === "high-converting");
    expect(hcFlow?.total_slots).toBe(10);
  });

  it("fashion flow has 8 slots", () => {
    const fFlow = flows.find((f) => f.preset_id === "fashion");
    expect(fFlow?.total_slots).toBe(8);
  });

  it("minimal-modern flow has 6 slots", () => {
    const mmFlow = flows.find((f) => f.preset_id === "minimal-modern");
    expect(mmFlow?.total_slots).toBe(6);
  });

  it("high-converting has correct required slot count", () => {
    const hcFlow = flows.find((f) => f.preset_id === "high-converting");
    expect(hcFlow?.required_slots).toBe(8);
  });

  it("editorial-hero has heavy visual_weight", () => {
    const hcFlow = flows.find((f) => f.preset_id === "high-converting");
    const heroSlot = hcFlow?.slots.find((s) => s.section_type === "editorial-hero");
    expect(heroSlot?.visual_weight).toBe("heavy");
  });

  it("trust section has high conversion_score (>= 90)", () => {
    const hcFlow = flows.find((f) => f.preset_id === "high-converting");
    const trustSlot = hcFlow?.slots.find((s) => s.section_family === "trust");
    expect(trustSlot?.conversion_score).toBeGreaterThanOrEqual(90);
  });

  it("urgency has highest conversion_score", () => {
    const hcFlow = flows.find((f) => f.preset_id === "high-converting");
    const urgencySlot = hcFlow?.slots.find((s) => s.section_family === "urgency");
    expect(urgencySlot?.conversion_score).toBe(100);
  });
});
