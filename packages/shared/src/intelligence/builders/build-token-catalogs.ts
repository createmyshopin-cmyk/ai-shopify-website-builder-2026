import type {
  AllDesignTokens,
  AnimationTokens,
  ButtonTokens,
  ColorTokens,
  RadiusTokens,
  ShadowTokens,
  SpacingTokens,
  TypographyTokens,
} from "../types/index.js";

// ─── L0: Build Token Catalogs ─────────────────────────────────────────────────
// Token keys are EXACT Shopify setting IDs from Base Theme (Horizon Pro 2.7.0).
// settings_schema.json IDs: primary, background, foreground_heading, etc.
// No invented names like color_primary_01, font_heading_modern.

interface SettingsData {
  current: {
    color_schemes?: Record<string, { settings: Record<string, string> }>;
    type_body_font?: string;
    type_heading_font?: string;
    type_subheading_font?: string;
    type_accent_font?: string;
    type_size_h2?: string;
    type_size_h3?: string;
    type_size_h4?: string;
    type_size_h5?: string;
    type_size_paragraph?: string;
    button_shape?: string;
    global_border_radius?: number;
    inputs_border_radius?: number;
    variant_button_radius?: number;
    card_2_border_radius?: number;
    card_gap?: number;
    card_shadow?: string;
    page_width?: string;
    page_transition_enabled?: boolean;
    card_hover_effect?: string;
    add_to_cart_animation?: string;
    [key: string]: unknown;
  };
}

export function buildColorTokens(settingsData: SettingsData): ColorTokens {
  const scheme = settingsData.current.color_schemes?.["scheme-1"]?.settings ?? {};

  // Use exact setting IDs from settings_schema.json color group
  return {
    primary:                    scheme["primary"]                    ?? "#2d1b4e",
    background:                 scheme["background"]                 ?? "#fafaf8",
    background_secondary:       scheme["background_secondary"]       ?? "#f0ede8",
    foreground:                 scheme["foreground"]                  ?? "#1a1815",
    foreground_heading:         scheme["foreground_heading"]         ?? "#1a1815",
    border:                     scheme["border"]                     ?? "rgba(26, 24, 21, 0.08)",
    shadow:                     scheme["shadow"]                     ?? "rgba(45, 27, 78, 0.06)",
    primary_button_background:  scheme["primary_button_background"]  ?? "#2d1b4e",
    primary_button_text:        scheme["primary_button_text"]        ?? "#ffffff",
    secondary_button_background:scheme["secondary_button_background"]?? "#6b6460",
    secondary_button_text:      scheme["secondary_button_text"]      ?? "#2d1b4e",
  };
}

export function buildTypographyTokens(settingsData: SettingsData): TypographyTokens {
  const s = settingsData.current;

  // Use exact setting IDs from settings_schema.json typography group
  return {
    type_heading_font:    s.type_heading_font    ?? "playfair_display_n7",
    type_body_font:       s.type_body_font       ?? "lato_n4",
    type_subheading_font: s.type_subheading_font ?? "poppins_n4",
    type_accent_font:     s.type_accent_font     ?? "playfair_display_n7",
    type_size_h2:         `${s.type_size_h2      ?? "36"}px`,
    type_size_h3:         `${s.type_size_h3      ?? "24"}px`,
    type_size_h4:         `${s.type_size_h4      ?? "18"}px`,
    type_size_h5:         `${s.type_size_h5      ?? "16"}px`,
    type_size_paragraph:  `${s.type_size_paragraph ?? "14"}px`,
  };
}

export function buildSpacingTokens(settingsData: SettingsData): SpacingTokens {
  const s = settingsData.current;

  // Spacing tokens derived from actual settings_data.json settings
  return {
    card_gap:  s.card_gap  ?? 20,
    page_width: s.page_width ?? "1200px",
  };
}

export function buildRadiusTokens(settingsData: SettingsData): RadiusTokens {
  const s = settingsData.current;

  // Use exact setting IDs from settings_schema.json
  return {
    global_border_radius:  s.global_border_radius  ?? 8,
    inputs_border_radius:  s.inputs_border_radius  ?? 8,
    variant_button_radius: s.variant_button_radius ?? 8,
    card_2_border_radius:  s.card_2_border_radius  ?? 18,
  };
}

export function buildShadowTokens(settingsData: SettingsData): ShadowTokens {
  const cardShadow = settingsData.current.card_shadow ?? "medium";

  // card_shadow is the only shadow-related setting in settings_data.json
  const shadowMap: Record<string, string> = {
    none:   "none",
    soft:   "0 1px 4px rgba(0,0,0,0.06)",
    medium: "0 2px 8px rgba(0,0,0,0.10)",
  };

  return {
    card_shadow: shadowMap[cardShadow] ?? shadowMap["medium"],
  };
}

export function buildButtonTokens(settingsData: SettingsData): ButtonTokens {
  const s = settingsData.current;
  const scheme = s.color_schemes?.["scheme-1"]?.settings ?? {};

  // Use exact setting IDs from settings_schema.json
  return {
    button_shape:              s.button_shape                          ?? "soft",
    global_border_radius:      s.global_border_radius                 ?? 8,
    primary_button_background: scheme["primary_button_background"]    ?? "#2d1b4e",
    primary_button_text:       scheme["primary_button_text"]          ?? "#ffffff",
    secondary_button_background: scheme["secondary_button_background"] ?? "#6b6460",
    secondary_button_text:     scheme["secondary_button_text"]        ?? "#2d1b4e",
  };
}

export function buildAnimationTokens(settingsData: SettingsData): AnimationTokens {
  const s = settingsData.current;

  // Use exact setting IDs from settings_schema.json
  return {
    page_transition_enabled: s.page_transition_enabled ?? false,
    card_hover_effect:       s.card_hover_effect       ?? "zoom",
    add_to_cart_animation:   s.add_to_cart_animation   ?? "pulse",
  };
}

export function buildAllTokenCatalogs(settingsData: SettingsData): AllDesignTokens {
  return {
    colors:     buildColorTokens(settingsData),
    typography: buildTypographyTokens(settingsData),
    spacing:    buildSpacingTokens(settingsData),
    radius:     buildRadiusTokens(settingsData),
    shadows:    buildShadowTokens(settingsData),
    buttons:    buildButtonTokens(settingsData),
    animations: buildAnimationTokens(settingsData),
  };
}

export type { SettingsData };
