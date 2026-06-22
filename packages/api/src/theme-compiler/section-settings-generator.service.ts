import { Injectable } from "@nestjs/common";

import type { CopyOutput, ImageOutput, VisionOutput } from "@theme-editor/shared";

// ─── SectionSettingsGeneratorService ─────────────────────────────────────────
// Maps copy/vision/image agent outputs to per-section Shopify settings.
// Uses role-based mapping derived from real Base Theme section_settings_raw IDs.
//
// CONTRACT: Callers must verify the section catalog exists BEFORE calling
// generateSettings(). If settings[] is empty, the section has no configurable
// fields — an empty object is the correct response (not synthetic fallback keys).
// Hardcoded fallback keys (heading/subheading/button_label) are FORBIDDEN.

export interface SettingDefInput {
  id: string;
  type: string;
  role: string;
  default?: unknown;
}

export interface SectionSettingsInput {
  sectionType: string;
  settings: SettingDefInput[];
  copy: CopyOutput;
  vision: VisionOutput;
  image: ImageOutput;
  resolvedTokens: Record<string, string>;
}

@Injectable()
export class SectionSettingsGeneratorService {
  generateSettings(input: SectionSettingsInput): Record<string, unknown> {
    const { settings, copy, vision, image, resolvedTokens } = input;

    // Empty settings is valid — some sections have no configurable fields.
    // Return an empty object; do NOT inject synthetic heading/subheading/button_label.
    if (settings.length === 0) {
      return {};
    }

    const result: Record<string, unknown> = {};
    const heroImage = image.assets.find((a) => a.role === "hero");
    const heroImageUrl = heroImage?.placeholderUrl;

    for (const def of settings) {
      switch (def.role) {
        case "headline":
          result[def.id] = copy.headline;
          break;
        case "subheadline":
          result[def.id] = copy.subheadline;
          break;
        case "cta":
          result[def.id] = copy.cta;
          break;
        case "image":
          if (heroImageUrl !== undefined) result[def.id] = heroImageUrl;
          break;
        case "button_background":
          result[def.id] = vision.primaryColors[0]
            ?? resolvedTokens["primary_button_background"]
            ?? "#2d1b4e";
          break;
        case "button_text":
          result[def.id] = resolvedTokens["primary_button_text"] ?? "#ffffff";
          break;
        case "color_scheme":
          result[def.id] = "scheme-1";
          break;
        default:
          if (def.default !== undefined) {
            result[def.id] = def.default;
          }
          break;
      }
    }

    return result;
  }
}
