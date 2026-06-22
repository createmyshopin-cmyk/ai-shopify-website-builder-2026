import type { DesignTokens } from "./types.js";

type SettingsData = Record<string, unknown>;
type SettingsSchemaGroup = {
  theme_name?: string;
  theme_version?: string;
  settings?: Array<{
    id?: string;
    type?: string;
    definition?: Array<{ id?: string }>;
  }>;
};

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function collectColorSchemes(settingsData: SettingsData): {
  schemes: Record<string, Record<string, string>>;
  activeScheme: string;
} {
  const raw = settingsData.color_schemes as
    | Record<string, { settings?: Record<string, unknown> }>
    | undefined;

  const schemes: Record<string, Record<string, string>> = {};

  if (raw) {
    for (const [schemeId, scheme] of Object.entries(raw)) {
      const tokens: Record<string, string> = {};
      for (const [key, value] of Object.entries(scheme.settings ?? {})) {
        const str = asString(value);
        if (str) {
          tokens[key] = str;
        }
      }
      schemes[schemeId] = tokens;
    }
  }

  const activeScheme = Object.keys(schemes)[0] ?? "scheme-1";
  return { schemes, activeScheme };
}

function extractTypography(settingsData: SettingsData): DesignTokens["typography"] {
  const fontKeys: Array<[string, string]> = [
    ["body", "type_body_font"],
    ["subheading", "type_subheading_font"],
    ["heading", "type_heading_font"],
    ["accent", "type_accent_font"],
  ];

  const fonts: DesignTokens["typography"]["fonts"] = {};
  for (const [role, settingId] of fontKeys) {
    const value = asString(settingsData[settingId]);
    if (value) {
      fonts[role] = { settingId, value, role };
    }
  }

  const scale: DesignTokens["typography"]["scale"] = {};

  const paragraphSize = asString(settingsData.type_size_paragraph);
  if (paragraphSize) {
    scale.paragraph = { size: `${paragraphSize}px` };
  }

  for (const level of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
    const size = asString(settingsData[`type_size_${level}`]);
    const font = asString(settingsData[`type_font_${level}`]);
    const lineHeight = asString(settingsData[`type_line_height_${level}`]);
    const letterSpacing = asString(settingsData[`type_letter_spacing_${level}`]);

    if (size || font || lineHeight || letterSpacing) {
      scale[level] = {
        ...(size ? { size: `${size}px` } : {}),
        ...(font ? { font } : {}),
        ...(lineHeight ? { lineHeight } : {}),
        ...(letterSpacing ? { letterSpacing } : {}),
      };
    }
  }

  return { fonts, scale };
}

function extractButtons(
  settingsData: SettingsData,
  schemes: Record<string, Record<string, string>>,
  activeScheme: string,
): DesignTokens["buttons"] {
  const scheme = schemes[activeScheme] ?? {};

  return {
    shape: asString(settingsData.button_shape),
    globalBorderRadius: asNumber(settingsData.global_border_radius),
    customRadius: asNumber(settingsData.button_radius_custom),
    primary: {
      background: scheme.primary_button_background,
      text: scheme.primary_button_text,
      border: scheme.primary_button_border,
    },
    secondary: {
      background: scheme.secondary_button_background,
      text: scheme.secondary_button_text,
      border: scheme.secondary_button_border,
    },
  };
}

function extractCards(settingsData: SettingsData): DesignTokens["cards"] {
  const card2Keys = [
    "card_2_background",
    "card_2_border_color",
    "card_2_border_radius",
    "card_2_title_color",
    "card_2_price_color",
    "card_2_button_background",
    "card_2_button_text",
    "card_2_button_label",
    "card_2_badge_background",
    "card_2_badge_text_color",
    "card_2_rating_color",
  ];

  const card2: Record<string, unknown> = {};
  for (const key of card2Keys) {
    if (settingsData[key] !== undefined) {
      card2[key] = settingsData[key];
    }
  }

  return {
    gap: asNumber(settingsData.card_gap),
    shadow: asString(settingsData.card_shadow),
    style: asString(settingsData.product_card_style),
    ...(Object.keys(card2).length > 0 ? { card2 } : {}),
  };
}

function extractSpacing(settingsData: SettingsData): DesignTokens["spacing"] {
  const cardGap = asNumber(settingsData.card_gap);
  return {
    pageWidth: asString(settingsData.page_width),
    ...(cardGap !== undefined ? { cardGap: `${cardGap}px` } : {}),
  };
}

function extractRadius(settingsData: SettingsData): Record<string, number> {
  const radius: Record<string, number> = {};
  const mappings: Array<[string, string]> = [
    ["global", "global_border_radius"],
    ["inputs", "inputs_border_radius"],
    ["variantButton", "variant_button_radius"],
    ["variantSwatch", "variant_swatch_radius"],
    ["badge", "badge_corner_radius"],
    ["card2", "card_2_border_radius"],
    ["pills", "pills_border_radius"],
    ["popover", "popover_border_radius"],
    ["customButton", "button_radius_custom"],
  ];

  for (const [key, settingId] of mappings) {
    const value = asNumber(settingsData[settingId]);
    if (value !== undefined) {
      radius[key] = value;
    }
  }

  return radius;
}

export function extractDesignTokens(
  settingsData: SettingsData,
  _settingsSchema: unknown[],
): DesignTokens {
  const { schemes, activeScheme } = collectColorSchemes(settingsData);

  return {
    colors: { schemes, activeScheme },
    typography: extractTypography(settingsData),
    buttons: extractButtons(settingsData, schemes, activeScheme),
    cards: extractCards(settingsData),
    spacing: extractSpacing(settingsData),
    radius: extractRadius(settingsData),
  };
}

export function extractThemeMeta(settingsSchema: unknown[]): {
  themeName: string;
  themeVersion: string;
} {
  const info = settingsSchema.find(
    (group) =>
      typeof group === "object" &&
      group !== null &&
      "theme_name" in group,
  ) as SettingsSchemaGroup | undefined;

  return {
    themeName: info?.theme_name ?? "Unknown",
    themeVersion: info?.theme_version ?? "0.0.0",
  };
}
