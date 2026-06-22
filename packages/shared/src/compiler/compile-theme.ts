import { CompilerOutputSchema, type CompilerOutput } from "../agents/types.js";
import type { CompilerInput, CompiledThemeOutput } from "./types.js";
import { CompiledThemeOutputSchema } from "./types.js";

function slugifySectionId(sectionType: string, index: number): string {
  return `${sectionType.replace(/[^a-z0-9_-]/gi, "_")}_${index}`;
}

/**
 * Deterministic theme compiler — PRD Phase 5.
 * AI agents supply structured data; this function produces theme file payloads.
 */
export function compileTheme(input: CompilerInput): CompiledThemeOutput {
  const allowed = new Set(input.blueprint.sections.map((section) => section.type));
  const sections: Record<string, unknown> = {};
  const order: string[] = [];
  const sectionManifest: CompiledThemeOutput["sections"] = [];

  for (const [index, sectionType] of input.layout.sectionOrder.entries()) {
    if (!allowed.has(sectionType)) {
      continue;
    }

    const sectionId = slugifySectionId(sectionType, index);
    const heroImage = input.image.assets.find((asset) => asset.role === "hero");
    const settings: Record<string, unknown> = {
      heading: input.copy.headline,
      subheading: input.copy.subheadline,
      button_label: input.copy.cta,
    };

    if (heroImage?.placeholderUrl) {
      settings.image = heroImage.placeholderUrl;
    }

    const block = { type: sectionType, settings };
    sections[sectionId] = block;
    order.push(sectionId);
    sectionManifest.push({ id: sectionId, type: sectionType, settings });
  }

  const primary = input.vision.primaryColors[0] ?? "#1a1a1a";
  const headerFont = input.blueprint.fonts[0] ?? "sans-serif";

  const settingsData: Record<string, unknown> = {
    color_primary: primary,
    type_header_font: headerFont,
    type_body_font: input.blueprint.fonts[1] ?? headerFont,
  };

  const cssVariables: Record<string, string> = {
    "--color-primary": primary,
    "--font-heading": headerFont,
  };

  return CompiledThemeOutputSchema.parse({
    indexJson: { sections, order },
    settingsData,
    cssVariables,
    sections: sectionManifest,
  });
}

export function toCompilerOutput(compiled: CompiledThemeOutput): CompilerOutput {
  return CompilerOutputSchema.parse({
    indexJson: compiled.indexJson,
    settingsPatch: compiled.settingsData,
    cssVariables: compiled.cssVariables,
  });
}

export function compileThemeAsAgentOutput(input: CompilerInput): CompilerOutput {
  return toCompilerOutput(compileTheme(input));
}
