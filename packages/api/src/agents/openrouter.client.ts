import OpenAI from "openai";

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4";

export function isMockAiMode(): boolean {
  const flag = process.env.MOCK_AI?.trim().toLowerCase();
  return flag === "true" || flag === "1" || !process.env.OPENROUTER_API_KEY?.trim();
}

export function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.SHOPIFY_APP_URL ?? "https://shopify-ai-theme-editor.local",
      "X-Title": "Shopify AI Theme Editor",
    },
  });
}

export async function completeJson<T>(options: {
  system: string;
  user: string;
  schema: { parse: (data: unknown) => T };
  model?: string;
}): Promise<T> {
  const client = getOpenRouterClient();
  const model = options.model ?? DEFAULT_MODEL;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    const fence = content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    parsed = JSON.parse((fence?.[1] ?? content).trim());
  }

  return options.schema.parse(parsed);
}
