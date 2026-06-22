import type { ThemeBlueprint } from "../blueprint/types.js";
import type { PreviewPatch, PreviewState } from "../preview/types.js";
import { getAvailableSectionTypes } from "../preview/preview-state.js";
import { ChatIntentLlmSchema, type ChatIntentLlm } from "./types.js";
import { assertPatchesSafe } from "./sanitize.js";

export interface ChatIntentContext {
  message: string;
  state: PreviewState;
  blueprint: ThemeBlueprint;
}

export interface ChatIntentResult {
  reply: string;
  patches: PreviewPatch[];
}

type CompleteJsonFn = <T>(options: {
  system: string;
  user: string;
  schema: { parse: (data: unknown) => T };
}) => Promise<T>;

function heroSectionId(state: PreviewState): string | undefined {
  const hero = state.sections.find(
    (section) =>
      section.enabled &&
      /hero|banner/i.test(section.type) &&
      state.order.includes(section.id),
  );
  return hero?.id ?? state.order[0];
}

function resolveSectionType(
  phrase: string,
  blueprint: ThemeBlueprint,
  state: PreviewState,
): string | undefined {
  const normalized = phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const available = getAvailableSectionTypes(blueprint);

  const aliases: Record<string, string[]> = {
    faq: ["faq", "faq-v2", "questions"],
    hero: ["hero", "editorial-hero", "banner", "image-banner"],
    testimonial: ["testimonials", "testimonial", "reviews", "trust badges", "trust"],
    video: ["video"],
    collection: ["featured-collection", "collection"],
    grid: ["featured-product-grid-v2", "product grid", "products"],
    text: ["rich-text", "rich text", "copy"],
  };

  for (const type of available) {
    if (normalized.includes(type.replace(/-/g, " ")) || normalized.includes(type)) {
      return type;
    }
  }

  for (const [type, keys] of Object.entries(aliases)) {
    if (keys.some((key) => normalized.includes(key))) {
      const match = available.find((entry) => entry.includes(type));
      if (match) {
        return match;
      }
    }
  }

  return available.find((type) => state.sections.every((section) => section.type !== type));
}

function parseColorValue(phrase: string): string | undefined {
  const lower = phrase.toLowerCase();
  const named: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    red: "#cc0000",
    blue: "#1a4fd6",
    green: "#1a7a3d",
    gold: "#c9a227",
  };

  for (const [name, hex] of Object.entries(named)) {
    if (lower.includes(name)) {
      return hex;
    }
  }

  const hex = phrase.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hex) {
    return hex[0].startsWith("#") ? hex[0] : `#${hex[0]}`;
  }

  return undefined;
}

/**
 * Deterministic intent parser for MOCK_AI and unit tests.
 */
export function parseChatIntentMock(context: ChatIntentContext): ChatIntentResult {
  const { message, state, blueprint } = context;
  const lower = message.toLowerCase().trim();
  const patches: PreviewPatch[] = [];

  const colorMatch =
    lower.match(/change (?:the )?colou?rs? to (.+)/i) ??
    lower.match(/make (?:it |the theme )?(.+?) colou?r/i) ??
    lower.match(/colou?rs? (?:to|should be) (.+)/i);

  if (colorMatch) {
    const color = parseColorValue(colorMatch[1] ?? lower);
    if (color) {
      patches.push({
        op: "updateTheme",
        settingsPatch: { color_primary: color },
        cssVariables: { "--color-primary": color },
      });
      return {
        reply: `Updated theme primary color to ${color}.`,
        patches,
      };
    }
  }

  if (/black/i.test(lower) && /colou?r|theme/i.test(lower)) {
    patches.push({
      op: "updateTheme",
      settingsPatch: { color_primary: "#000000" },
      cssVariables: { "--color-primary": "#000000" },
    });
    return { reply: "Changed colors to black.", patches };
  }

  const headlineMatch =
    message.match(/(?:change|set|update) (?:the )?headline to (.+)/i) ??
    message.match(/headline:?\s*(.+)/i);

  if (headlineMatch) {
    const sectionId = heroSectionId(state);
    if (sectionId) {
      patches.push({
        op: "updateSection",
        sectionId,
        settings: { heading: headlineMatch[1].trim().slice(0, 200) },
      });
      return {
        reply: `Updated headline on the hero section.`,
        patches,
      };
    }
  }

  if (/make hero smaller|smaller hero|reduce hero/i.test(lower)) {
    const sectionId = heroSectionId(state);
    if (sectionId) {
      patches.push({
        op: "updateSection",
        sectionId,
        settings: { padding: "compact", image_height: "small" },
      });
      return { reply: "Made the hero section more compact.", patches };
    }
  }

  const addMatch =
    lower.match(/add (?:a |an )?(.+?)(?: section)?$/i) ??
    lower.match(/insert (?:a |an )?(.+?)(?: section)?$/i);

  if (addMatch) {
    const sectionType = resolveSectionType(addMatch[1], blueprint, state);
    if (sectionType) {
      patches.push({ op: "addSection", sectionType });
      return {
        reply: `Added a ${sectionType.replace(/-/g, " ")} section to the preview.`,
        patches,
      };
    }
  }

  if (/hide (?:the )?hero|remove (?:the )?hero/i.test(lower)) {
    const sectionId = heroSectionId(state);
    if (sectionId) {
      patches.push({ op: "toggleSection", sectionId, enabled: false });
      return { reply: "Hid the hero section in preview.", patches };
    }
  }

  if (/add faq|faq section/i.test(lower)) {
    const sectionType = resolveSectionType("faq", blueprint, state);
    if (sectionType) {
      patches.push({ op: "addSection", sectionType });
      return { reply: "Added an FAQ section.", patches };
    }
  }

  if (/trust badge/i.test(lower)) {
    const sectionType = resolveSectionType("testimonials", blueprint, state);
    if (sectionType) {
      patches.push({ op: "addSection", sectionType });
      return { reply: "Added a trust badges section.", patches };
    }
  }

  return {
    reply:
      "I can change colors, edit the headline, resize the hero, or add sections like FAQ. Try: “Change colors to black” or “Add FAQ section”.",
    patches: [],
  };
}

export async function resolveChatIntent(
  context: ChatIntentContext,
  options: {
    useMock?: boolean;
    completeJson?: CompleteJsonFn;
  } = {},
): Promise<ChatIntentResult> {
  if (options.useMock !== false && !options.completeJson) {
    return parseChatIntentMock(context);
  }

  if (!options.completeJson) {
    return parseChatIntentMock(context);
  }

  const allowedTypes = getAvailableSectionTypes(context.blueprint);
  const sectionSummary = context.state.sections.map((section) => ({
    id: section.id,
    type: section.type,
    enabled: section.enabled,
    heading: section.settings.heading,
  }));

  const llm = await options.completeJson<ChatIntentLlm>({
    system: [
      "You convert merchant chat into safe preview-only theme edits.",
      "Return JSON: reply (short), patches (array, max 5).",
      "Allowed patch ops: updateSection, toggleSection, addSection, updateTheme, reorder.",
      "NEVER use restore. NEVER reference Liquid, file paths, or HTML.",
      "sectionId must exist in the provided sections list.",
      "addSection.sectionType must be one of allowed blueprint types only.",
      "Settings values must be plain text or numbers — no markup.",
      `Allowed section types: ${allowedTypes.join(", ")}.`,
    ].join("\n"),
    user: JSON.stringify({
      message: context.message,
      sections: sectionSummary,
      order: context.state.order,
    }),
    schema: ChatIntentLlmSchema,
  });

  assertPatchesSafe(
    llm.patches as Array<{ op: string; settings?: Record<string, unknown> }>,
  );

  return { reply: llm.reply, patches: llm.patches };
}
