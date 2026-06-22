import OpenAI from "openai";

import {
  formatLlmPromptContextForSystem,
  getLlmPromptContext,
  loadLlmThemeMap,
  type AiStylePresetKey,
} from "@theme-editor/shared";

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface PageGenerationInput {
  products: unknown[];
  preset: AiStylePresetKey;
  primaryColor: string;
  modelString?: string;
}

export interface ShopifyIndexTemplate {
  sections: Record<
    string,
    {
      type: string;
      settings?: Record<string, unknown>;
      blocks?: Record<
        string,
        {
          type: string;
          settings?: Record<string, unknown>;
        }
      >;
      block_order?: string[];
    }
  >;
  order: string[];
}

function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "[ai.server] OPENROUTER_API_KEY is not configured. Add it to your .env file.",
    );
  }

  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.SHOPIFY_APP_URL || "https://shopify-ai-theme-editor.local",
      "X-Title": "MVP Shopify AI Theme Editor",
    },
  });
}

function tryLoadThemeMapContext(preset: AiStylePresetKey): string | null {
  try {
    const map = loadLlmThemeMap();
    const context = getLlmPromptContext(map, preset, {
      maxCatalogSections: 40,
    });
    return formatLlmPromptContextForSystem(context);
  } catch (error) {
    console.warn(
      "[ai.server] Theme LLM map unavailable; using generic section guidance",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function buildSystemPrompt(input: PageGenerationInput): string {
  const presetGuidance: Record<AiStylePresetKey, string> = {
    "high-converting": [
      "Prioritize conversion rate optimization: bold hero with a single primary CTA,",
      "benefit-driven copy, social proof (testimonials/reviews), trust badges,",
      "urgency elements, and a strong final CTA section.",
    ].join(" "),
    fashion: [
      "Optimize for fashion and apparel: editorial hero imagery, lookbook-style grids,",
      "size/fit trust signals, lifestyle storytelling, and elegant typography-led sections.",
    ].join(" "),
    minimal: [
      "Use a restrained layout: generous whitespace, typography-led hero,",
      "a focused product grid, and at most one subtle trust element.",
    ].join(" "),
  };

  const themeMapContext = tryLoadThemeMapContext(input.preset);

  const sections: string[] = [
    "You are a Senior Shopify Developer and CRO (Conversion Rate Optimization) Specialist.",
    "Your task is to design a homepage layout as a Shopify Online Store 2.0 template JSON file for the Horizon Pro theme.",
    "",
    "OUTPUT FORMAT — return ONLY a valid JSON object matching Shopify's templates/index.json schema:",
    "{",
    '  "sections": {',
    '    "<unique_section_id>": {',
    '      "type": "<section_type>",',
    '      "settings": { /* section-specific settings */ },',
    '      "blocks": {',
    '        "<unique_block_id>": {',
    '          "type": "<block_type>",',
    '          "settings": { /* block-specific settings */ }',
    "        }",
    "      },",
    '      "block_order": ["<block_id>", "..."]',
    "    }",
    "  },",
    '  "order": ["<section_id>", "..."]',
    "}",
    "",
    "RULES:",
    "- Use ONLY section types from the Horizon Pro theme catalog below (not Dawn/generic types).",
    "- Populate settings using valid setting IDs for each section type (see catalog).",
    "- Use setting roles: headline settings for titles, subheadline for descriptions, cta for button labels.",
    "- Populate settings with merchant-ready copy derived from the provided product data.",
    `- Apply the primary brand color (${input.primaryColor}) in button_bg, text_color, and accent settings where appropriate.`,
    `- Layout preset: ${input.preset}. ${presetGuidance[input.preset]}`,
    "- Follow the suggested landing page recipe section order when possible.",
    "- Every section in `order` must exist in `sections`.",
    "- Use kebab-case or snake_case for section and block IDs; keep IDs unique.",
    "- Do NOT wrap the response in markdown code fences.",
    "- Do NOT include comments or trailing commas in the JSON.",
  ];

  if (themeMapContext) {
    sections.push("", themeMapContext);
  } else {
    sections.push(
      "",
      "Fallback section types: editorial-hero, editorial-marquee, brand-story,",
      "editorial-collection-grid, bestsellers-row, editorial-testimonials,",
      "editorial-trust-bar, editorial-newsletter, editorial-promo-banner.",
    );
  }

  return sections.join("\n");
}

function buildUserPrompt(input: PageGenerationInput): string {
  return [
    "Analyze the following Shopify products and generate a complete index.json homepage layout.",
    "",
    `Preset: ${input.preset}`,
    `Primary color: ${input.primaryColor}`,
    "",
    "Products (GraphQL payload):",
    JSON.stringify(input.products, null, 2),
  ].join("\n");
}

function parseJsonResponse(raw: string): ShopifyIndexTemplate {
  const trimmed = raw.trim();

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonString = fenceMatch ? fenceMatch[1].trim() : trimmed;

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    console.error("[ai.server] Failed to parse AI response as JSON:", {
      preview: jsonString.slice(0, 500),
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      "[ai.server] AI returned malformed JSON. See server logs for details.",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("sections" in parsed) ||
    !("order" in parsed)
  ) {
    console.error("[ai.server] AI response missing required index.json fields:", {
      keys: typeof parsed === "object" && parsed !== null ? Object.keys(parsed) : [],
    });
    throw new Error(
      "[ai.server] AI response does not match Shopify index.json structure (missing sections or order).",
    );
  }

  return parsed as ShopifyIndexTemplate;
}

export async function generateLandingPageLayout(
  input: PageGenerationInput,
): Promise<ShopifyIndexTemplate> {
  const model = input.modelString ?? DEFAULT_MODEL;
  const client = getOpenRouterClient();

  console.info("[ai.server] Generating landing page layout", {
    model,
    preset: input.preset,
    primaryColor: input.primaryColor,
    productCount: input.products.length,
  });

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input) },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("[ai.server] OpenRouter returned an empty completion", {
        model,
        finishReason: completion.choices[0]?.finish_reason,
      });
      throw new Error("[ai.server] OpenRouter returned an empty response.");
    }

    const layout = parseJsonResponse(content);

    console.info("[ai.server] Landing page layout generated successfully", {
      model,
      sectionCount: layout.order.length,
    });

    return layout;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error("[ai.server] OpenRouter API error", {
        status: error.status,
        code: error.code,
        message: error.message,
        type: error.type,
      });
      throw new Error(
        `[ai.server] OpenRouter request failed (${error.status ?? "unknown"}): ${error.message}`,
      );
    }

    if (error instanceof Error) {
      console.error("[ai.server] Layout generation failed:", error.message);
      throw error;
    }

    console.error("[ai.server] Unexpected error during layout generation:", error);
    throw new Error("[ai.server] An unexpected error occurred during layout generation.");
  }
}
