import { describe, it, expect } from "vitest";

import { PresetFlowEngine } from "./preset-flow-engine.js";

describe("PresetFlowEngine", () => {
  const engine = new PresetFlowEngine();

  describe("getSectionOrder", () => {
    it("returns exactly 8 required sections for high-converting", () => {
      const order = engine.getSectionOrder("high-converting");
      expect(order).toHaveLength(8);
    });

    it("returns exactly 6 required sections for fashion", () => {
      const order = engine.getSectionOrder("fashion");
      expect(order).toHaveLength(6);
    });

    it("returns exactly 5 required sections for minimal-modern", () => {
      const order = engine.getSectionOrder("minimal-modern");
      expect(order).toHaveLength(5);
    });

    it("is deterministic — same output on every call", () => {
      const order1 = engine.getSectionOrder("high-converting");
      const order2 = engine.getSectionOrder("high-converting");
      const order3 = engine.getSectionOrder("high-converting");
      expect(order1).toEqual(order2);
      expect(order2).toEqual(order3);
    });

    it("high-converting starts with editorial-hero", () => {
      const order = engine.getSectionOrder("high-converting");
      expect(order[0]).toBe("editorial-hero");
    });

    it("fashion starts with editorial-hero", () => {
      const order = engine.getSectionOrder("fashion");
      expect(order[0]).toBe("editorial-hero");
    });

    it("minimal-modern starts with editorial-hero", () => {
      const order = engine.getSectionOrder("minimal-modern");
      expect(order[0]).toBe("editorial-hero");
    });

    it("throws for unknown preset", () => {
      expect(() => engine.getSectionOrder("unknown-preset")).toThrow("Unknown preset");
    });
  });

  describe("getVariantForSlot", () => {
    // preferred_variant is now optional — VariantSelectionService chooses the real handle.
    // getVariantForSlot returns "default" when no preferred_variant is set.
    it("returns default for high-converting slot 1 (preferred_variant is optional)", () => {
      expect(engine.getVariantForSlot("high-converting", 1)).toBe("default");
    });

    it("returns default for fashion slot 1 (preferred_variant is optional)", () => {
      expect(engine.getVariantForSlot("fashion", 1)).toBe("default");
    });

    it("returns default for minimal-modern slot 1 (preferred_variant is optional)", () => {
      expect(engine.getVariantForSlot("minimal-modern", 1)).toBe("default");
    });

    it("returns default for unknown slot", () => {
      expect(engine.getVariantForSlot("high-converting", 99)).toBe("default");
    });
  });

  describe("getFlow", () => {
    it("returns correct min/max for high-converting", () => {
      const flow = engine.getFlow("high-converting");
      expect(flow.min_sections).toBe(8);
      expect(flow.max_sections).toBe(10);
    });

    it("returns correct min/max for fashion", () => {
      const flow = engine.getFlow("fashion");
      expect(flow.min_sections).toBe(6);
      expect(flow.max_sections).toBe(8);
    });

    it("returns correct min/max for minimal-modern", () => {
      const flow = engine.getFlow("minimal-modern");
      expect(flow.min_sections).toBe(5);
      expect(flow.max_sections).toBe(6);
    });

    it("returns 8 required slots for high-converting", () => {
      const flow = engine.getFlow("high-converting");
      expect(flow.required_count).toBe(8);
    });
  });

  describe("validateSectionCount", () => {
    it("passes for valid count", () => {
      const result = engine.validateSectionCount("high-converting", 8);
      expect(result.valid).toBe(true);
    });

    it("fails for count below minimum", () => {
      const result = engine.validateSectionCount("high-converting", 5);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/minimum/i);
    });

    it("fails for count above maximum", () => {
      const result = engine.validateSectionCount("high-converting", 15);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/maximum/i);
    });
  });

  describe("validateAgainstBlueprint", () => {
    it("returns valid when all required sections available", () => {
      const requiredTypes = engine.getSectionOrder("high-converting");
      const result = engine.validateAgainstBlueprint("high-converting", requiredTypes);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("returns missing when required section not in blueprint", () => {
      const result = engine.validateAgainstBlueprint("high-converting", ["editorial-hero"]);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe("getPresetTokenRefs", () => {
    it("returns real Base Theme setting IDs for high-converting", () => {
      const refs = engine.getPresetTokenRefs("high-converting");
      // Real Shopify setting IDs — no invented names
      expect(refs.colors).toContain("primary");
      expect(refs.colors).toContain("background");
      expect(refs.buttons).toContain("primary_button_background");
      // Invented IDs must be absent
      expect(refs.colors).not.toContain("color_primary_01");
      expect(refs.buttons).not.toContain("btn_primary_bg");
    });

    it("fashion uses real Base Theme spacing setting IDs", () => {
      const refs = engine.getPresetTokenRefs("fashion");
      // Real Shopify setting IDs
      expect(refs.spacing).toContain("card_gap");
      expect(refs.spacing).toContain("page_width");
      // Invented IDs must be absent
      expect(refs.spacing).not.toContain("space_20");
    });
  });

  describe("determinism across 100 calls", () => {
    it("getSectionOrder is always identical", () => {
      const results = Array.from({ length: 100 }, () =>
        engine.getSectionOrder("high-converting"),
      );
      const first = results[0]!;
      expect(results.every((r) => JSON.stringify(r) === JSON.stringify(first))).toBe(true);
    });
  });
});
