import {
  VisionOutputSchema,
  type AgentPipelineInput,
  type VisionOutput,
} from "@theme-editor/shared";

import { completeJson, isMockAiMode } from "./openrouter.client.js";
import { GOLDEN_AGENT_OUTPUTS } from "@theme-editor/shared";

export async function runVisionAgent(
  input: AgentPipelineInput,
): Promise<VisionOutput> {
  if (isMockAiMode()) {
    return VisionOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.vision);
  }

  const allowedSections = input.blueprint.sections
    .slice(0, 40)
    .map((s) => s.type)
    .join(", ");

  return completeJson({
    system: [
      "You are the Vision Agent for a Shopify theme AI pipeline.",
      "Return JSON only with keys: niche, productSummary, primaryColors (hex array), tone, targetAudience.",
      `Style preset: ${input.stylePreset}.`,
      `Allowed theme section types from blueprint: ${allowedSections}.`,
      "Extract colors aligned with the brand; prefer hex codes from blueprint when relevant.",
    ].join("\n"),
    user: JSON.stringify({
      productIds: input.productIds,
      products: input.products ?? [],
      blueprintColors: input.blueprint.colors.slice(0, 20),
    }),
    schema: VisionOutputSchema,
  });
}
