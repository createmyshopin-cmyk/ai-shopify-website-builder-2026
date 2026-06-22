import { describe, it, expect } from "vitest";

import { TokenResolver } from "./token-resolver.js";
import type { AllDesignTokens } from "../types/token-types.js";

// Real Base Theme token values (Horizon Pro 2.7.0)
const REAL_TOKENS: AllDesignTokens = {
  colors: {
    primary:                   "#2d1b4e",
    background:                "#fafaf8",
    background_secondary:      "#f0ede8",
    foreground:                "#1a1815",
    foreground_heading:        "#1a1815",
    border:                    "rgba(26, 24, 21, 0.08)",
    shadow:                    "rgba(45, 27, 78, 0.06)",
    primary_button_background: "#2d1b4e",
    primary_button_text:       "#ffffff",
    secondary_button_background:"#6b6460",
    secondary_button_text:     "#2d1b4e",
  },
  typography: {
    type_heading_font:    "playfair_display_n7",
    type_body_font:       "lato_n4",
    type_subheading_font: "poppins_n4",
    type_accent_font:     "playfair_display_n7",
    type_size_h2:         "36px",
    type_size_paragraph:  "14px",
  },
  spacing: {
    card_gap:   20,
    page_width: "1200px",
  },
  radius: {
    global_border_radius:  8,
    inputs_border_radius:  8,
    variant_button_radius: 8,
    card_2_border_radius:  18,
  },
  shadows: {
    card_shadow: "0 2px 8px rgba(0,0,0,0.10)",
  },
  buttons: {
    button_shape:              "soft",
    global_border_radius:      8,
    primary_button_background: "#2d1b4e",
    primary_button_text:       "#ffffff",
  },
  animations: {
    page_transition_enabled: false,
    card_hover_effect:       "zoom",
    add_to_cart_animation:   "pulse",
  },
};

describe("TokenResolver", () => {
  const resolver = new TokenResolver(REAL_TOKENS);

  describe("resolve", () => {
    it("resolves primary color to #2d1b4e", () => {
      expect(resolver.resolve("primary")).toBe("#2d1b4e");
    });

    it("resolves background to #fafaf8", () => {
      expect(resolver.resolve("background")).toBe("#fafaf8");
    });

    it("resolves type_heading_font correctly", () => {
      expect(resolver.resolve("type_heading_font")).toBe("playfair_display_n7");
    });

    it("resolves primary_button_background to #2d1b4e", () => {
      expect(resolver.resolve("primary_button_background")).toBe("#2d1b4e");
    });

    it("returns undefined for invented ID color_primary_01", () => {
      expect(resolver.resolve("color_primary_01")).toBeUndefined();
    });

    it("returns undefined for invented ID font_heading_modern", () => {
      expect(resolver.resolve("font_heading_modern")).toBeUndefined();
    });

    it("returns undefined for invented ID btn_primary_bg", () => {
      expect(resolver.resolve("btn_primary_bg")).toBeUndefined();
    });

    it("returns undefined for unknown token", () => {
      expect(resolver.resolve("definitely_not_a_real_token")).toBeUndefined();
    });

    it("resolves card_gap (number) correctly", () => {
      expect(resolver.resolve("card_gap")).toBe(20);
    });

    it("resolves page_transition_enabled (boolean) correctly", () => {
      expect(resolver.resolve("page_transition_enabled")).toBe(false);
    });
  });

  describe("resolveMany", () => {
    it("resolves multiple real token IDs", () => {
      const result = resolver.resolveMany(["primary", "background", "type_heading_font"]);
      expect(result["primary"]).toBe("#2d1b4e");
      expect(result["background"]).toBe("#fafaf8");
      expect(result["type_heading_font"]).toBe("playfair_display_n7");
    });

    it("skips unknown token IDs silently", () => {
      const result = resolver.resolveMany(["primary", "color_primary_01", "background"]);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["primary"]).toBeDefined();
      expect(result["color_primary_01"]).toBeUndefined();
    });
  });

  describe("resolveRefs", () => {
    it("resolves token refs with real IDs", () => {
      const refs = {
        colors: ["primary", "background", "primary_button_background"],
        typography: ["type_heading_font"],
        spacing: ["card_gap"],
        radius: ["global_border_radius"],
        shadows: ["card_shadow"],
        buttons: ["primary_button_background"],
        animations: ["card_hover_effect"],
      };
      const result = resolver.resolveRefs(refs);
      expect(result["primary"]).toBe("#2d1b4e");
      expect(result["type_heading_font"]).toBe("playfair_display_n7");
    });
  });

  describe("getAllFlat", () => {
    it("returns a flat map with all token IDs as keys", () => {
      const flat = resolver.getAllFlat();
      expect(flat["primary"]).toBe("#2d1b4e");
      expect(flat["type_heading_font"]).toBe("playfair_display_n7");
      expect(flat["card_gap"]).toBe(20);
      expect(flat["global_border_radius"]).toBe(8);
    });

    it("does NOT contain invented token IDs", () => {
      const flat = resolver.getAllFlat();
      expect(flat["color_primary_01"]).toBeUndefined();
      expect(flat["font_heading_modern"]).toBeUndefined();
      expect(flat["btn_primary_bg"]).toBeUndefined();
      expect(flat["space_08"]).toBeUndefined();
    });
  });

  describe("fromTokens static factory", () => {
    it("creates a resolver from token catalog", () => {
      const r = TokenResolver.fromTokens(REAL_TOKENS);
      expect(r.resolve("primary")).toBe("#2d1b4e");
    });
  });
});
