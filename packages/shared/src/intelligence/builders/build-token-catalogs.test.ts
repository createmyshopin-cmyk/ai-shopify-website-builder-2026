import { describe, it, expect } from "vitest";

import {
  buildColorTokens,
  buildTypographyTokens,
  buildSpacingTokens,
  buildRadiusTokens,
  buildShadowTokens,
  buildButtonTokens,
  buildAnimationTokens,
  buildAllTokenCatalogs,
  type SettingsData,
} from "./build-token-catalogs.js";

// ─── Mock settings using exact Horizon Pro 2.7.0 setting IDs ─────────────────

const mockSettingsData: SettingsData = {
  current: {
    type_body_font: "lato_n4",
    type_heading_font: "playfair_display_n7",
    type_subheading_font: "poppins_n4",
    type_accent_font: "playfair_display_n7",
    type_size_h2: "36",
    type_size_h3: "24",
    type_size_h4: "18",
    type_size_h5: "16",
    type_size_paragraph: "14",
    button_shape: "soft",
    global_border_radius: 8,
    inputs_border_radius: 8,
    variant_button_radius: 8,
    card_2_border_radius: 18,
    card_gap: 20,
    card_shadow: "medium",
    page_width: "1200px",
    page_transition_enabled: false,
    card_hover_effect: "zoom",
    add_to_cart_animation: "pulse",
    color_schemes: {
      "scheme-1": {
        settings: {
          primary:                     "#2d1b4e",
          background:                  "#fafaf8",
          background_secondary:        "#f0ede8",
          foreground:                  "#1a1815",
          foreground_heading:          "#1a1815",
          border:                      "rgba(26, 24, 21, 0.08)",
          shadow:                      "rgba(45, 27, 78, 0.06)",
          primary_button_background:   "#2d1b4e",
          primary_button_text:         "#ffffff",
          secondary_button_background: "#6b6460",
          secondary_button_text:       "#2d1b4e",
        },
      },
    },
  },
};

// ─── buildColorTokens ─────────────────────────────────────────────────────────

describe("buildColorTokens", () => {
  const tokens = buildColorTokens(mockSettingsData);

  it("uses 'primary' as the token key (exact Shopify setting ID)", () => {
    expect(tokens["primary"]).toBe("#2d1b4e");
  });

  it("uses 'background' as the token key", () => {
    expect(tokens["background"]).toBe("#fafaf8");
  });

  it("uses 'primary_button_background' as the token key", () => {
    expect(tokens["primary_button_background"]).toBe("#2d1b4e");
  });

  it("uses 'primary_button_text' as the token key", () => {
    expect(tokens["primary_button_text"]).toBe("#ffffff");
  });

  it("does NOT contain invented key 'color_primary_01'", () => {
    expect(tokens["color_primary_01"]).toBeUndefined();
  });

  it("does NOT contain invented key 'color_button_primary_bg'", () => {
    expect(tokens["color_button_primary_bg"]).toBeUndefined();
  });

  it("does NOT contain invented key 'color_background_01'", () => {
    expect(tokens["color_background_01"]).toBeUndefined();
  });
});

// ─── buildTypographyTokens ────────────────────────────────────────────────────

describe("buildTypographyTokens", () => {
  const tokens = buildTypographyTokens(mockSettingsData);

  it("uses 'type_heading_font' as the token key", () => {
    expect(tokens["type_heading_font"]).toBe("playfair_display_n7");
  });

  it("uses 'type_body_font' as the token key", () => {
    expect(tokens["type_body_font"]).toBe("lato_n4");
  });

  it("uses 'type_size_h2' as the token key (with px suffix)", () => {
    expect(tokens["type_size_h2"]).toBe("36px");
  });

  it("does NOT contain invented key 'font_heading_modern'", () => {
    expect(tokens["font_heading_modern"]).toBeUndefined();
  });

  it("does NOT contain invented key 'font_body_clean'", () => {
    expect(tokens["font_body_clean"]).toBeUndefined();
  });

  it("does NOT contain invented key 'type_scale_h1'", () => {
    expect(tokens["type_scale_h1"]).toBeUndefined();
  });
});

// ─── buildSpacingTokens ───────────────────────────────────────────────────────

describe("buildSpacingTokens", () => {
  const tokens = buildSpacingTokens(mockSettingsData);

  it("uses 'card_gap' as the token key (exact Shopify setting ID)", () => {
    expect(tokens["card_gap"]).toBe(20);
  });

  it("uses 'page_width' as the token key", () => {
    expect(tokens["page_width"]).toBe("1200px");
  });

  it("does NOT contain invented key 'space_01'", () => {
    expect(tokens["space_01"]).toBeUndefined();
  });

  it("does NOT contain invented key 'space_08'", () => {
    expect(tokens["space_08"]).toBeUndefined();
  });
});

// ─── buildRadiusTokens ────────────────────────────────────────────────────────

describe("buildRadiusTokens", () => {
  const tokens = buildRadiusTokens(mockSettingsData);

  it("uses 'global_border_radius' as the token key", () => {
    expect(tokens["global_border_radius"]).toBe(8);
  });

  it("uses 'card_2_border_radius' as the token key", () => {
    expect(tokens["card_2_border_radius"]).toBe(18);
  });

  it("does NOT contain invented key 'radius_md'", () => {
    expect(tokens["radius_md"]).toBeUndefined();
  });

  it("does NOT contain invented key 'radius_none'", () => {
    expect(tokens["radius_none"]).toBeUndefined();
  });
});

// ─── buildShadowTokens ────────────────────────────────────────────────────────

describe("buildShadowTokens", () => {
  it("uses 'card_shadow' as the token key with CSS value for medium", () => {
    const tokens = buildShadowTokens(mockSettingsData);
    expect(tokens["card_shadow"]).toBe("0 2px 8px rgba(0,0,0,0.10)");
  });

  it("resolves 'soft' card_shadow correctly", () => {
    const softData: SettingsData = { current: { ...mockSettingsData.current, card_shadow: "soft" } };
    const tokens = buildShadowTokens(softData);
    expect(tokens["card_shadow"]).toBe("0 1px 4px rgba(0,0,0,0.06)");
  });
});

// ─── buildButtonTokens ────────────────────────────────────────────────────────

describe("buildButtonTokens", () => {
  const tokens = buildButtonTokens(mockSettingsData);

  it("uses 'button_shape' as the token key", () => {
    expect(tokens["button_shape"]).toBe("soft");
  });

  it("uses 'primary_button_background' as the token key", () => {
    expect(tokens["primary_button_background"]).toBe("#2d1b4e");
  });

  it("uses 'primary_button_text' as the token key", () => {
    expect(tokens["primary_button_text"]).toBe("#ffffff");
  });

  it("does NOT contain invented key 'btn_primary_bg'", () => {
    expect(tokens["btn_primary_bg"]).toBeUndefined();
  });

  it("does NOT contain invented key 'btn_primary_radius'", () => {
    expect(tokens["btn_primary_radius"]).toBeUndefined();
  });
});

// ─── buildAnimationTokens ─────────────────────────────────────────────────────

describe("buildAnimationTokens", () => {
  const tokens = buildAnimationTokens(mockSettingsData);

  it("uses 'card_hover_effect' as the token key", () => {
    expect(tokens["card_hover_effect"]).toBe("zoom");
  });

  it("uses 'page_transition_enabled' as the token key", () => {
    expect(tokens["page_transition_enabled"]).toBe(false);
  });

  it("does NOT contain invented key 'anim_duration_fast'", () => {
    expect(tokens["anim_duration_fast"]).toBeUndefined();
  });

  it("does NOT contain invented key 'anim_duration_normal'", () => {
    expect(tokens["anim_duration_normal"]).toBeUndefined();
  });
});

// ─── buildAllTokenCatalogs ────────────────────────────────────────────────────

describe("buildAllTokenCatalogs", () => {
  const all = buildAllTokenCatalogs(mockSettingsData);

  it("returns all 7 token categories", () => {
    expect(Object.keys(all)).toEqual(["colors", "typography", "spacing", "radius", "shadows", "buttons", "animations"]);
  });

  it("colors.primary is the exact Base Theme setting value", () => {
    expect(all.colors["primary"]).toBe("#2d1b4e");
  });

  it("typography.type_heading_font is the exact Base Theme setting value", () => {
    expect(all.typography["type_heading_font"]).toBe("playfair_display_n7");
  });

  it("spacing.card_gap is the numeric Base Theme setting value", () => {
    expect(all.spacing["card_gap"]).toBe(20);
  });

  it("radius.global_border_radius is the numeric Base Theme setting value", () => {
    expect(all.radius["global_border_radius"]).toBe(8);
  });

  it("animations.card_hover_effect is the string Base Theme setting value", () => {
    expect(all.animations["card_hover_effect"]).toBe("zoom");
  });
});
