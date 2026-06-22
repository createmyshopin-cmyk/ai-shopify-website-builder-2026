import {
  CopyOutputSchema,
  GOLDEN_AGENT_OUTPUTS,
  type AgentPipelineInput,
  type CopyOutput,
  type CopyIntelligence,
  type VisionOutput,
} from "@theme-editor/shared";

import { completeJson, isMockAiMode } from "./openrouter.client.js";

export async function runCopyAgent(
  input: AgentPipelineInput,
  vision: VisionOutput,
  copyIntelligence?: CopyIntelligence | null,
): Promise<CopyOutput> {
  if (isMockAiMode()) {
    return CopyOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.copy);
  }

  // Build copy intelligence guidance lines from the preset catalog.
  // These ensure each preset produces a genuinely distinct copy personality.
  const copyGuidanceLines: string[] = [];
  if (copyIntelligence) {
    copyGuidanceLines.push(
      "COPY PERSONALITY (follow strictly — this defines the brand voice):",
      `• Headline style: ${copyIntelligence.headline_style}`,
      `• Description style: ${copyIntelligence.description_style}`,
      `• CTA style: ${copyIntelligence.cta_style}`,
      `• Social proof style: ${copyIntelligence.social_proof_style}`,
      `• Emotion style: ${copyIntelligence.emotion_style}`,
      ...(copyIntelligence.urgency_style
        ? [`• Urgency style: ${copyIntelligence.urgency_style}`]
        : []),
    );
  }

  return completeJson({
    system: [
      "You are the Copy Agent for a Shopify storefront.",
      "Return JSON with: headline, subheadline, benefits (array), faq (array of {question, answer}), cta, seoTitle, seoDescription.",
      `Tone: ${vision.tone}. Niche: ${vision.niche}.`,
      `Style preset: ${input.stylePreset}.`,
      ...copyGuidanceLines,
      "Write merchant-ready copy; no markdown.",
    ].join("\n"),
    user: JSON.stringify({
      vision,
      productIds: input.productIds,
      products: input.products ?? [],
    }),
    schema: CopyOutputSchema,
  });
}
