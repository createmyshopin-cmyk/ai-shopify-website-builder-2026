import {
  ImageOutputSchema,
  type AgentPipelineInput,
  type CopyOutput,
  type ImageOutput,
  type VisionOutput,
} from "@theme-editor/shared";

import { completeJson, isMockAiMode } from "./openrouter.client.js";
import { GOLDEN_AGENT_OUTPUTS } from "@theme-editor/shared";

export async function runImageAgent(
  input: AgentPipelineInput,
  vision: VisionOutput,
  copy: CopyOutput,
): Promise<ImageOutput> {
  if (isMockAiMode()) {
    return ImageOutputSchema.parse(GOLDEN_AGENT_OUTPUTS.image);
  }

  return completeJson({
    system: [
      "You are the Image Agent. Plan visual assets (not generate binary images).",
      "Return JSON: { assets: [{ role: hero|lifestyle|collection, prompt, altText, placeholderUrl }] }.",
      "Use https://placehold.co URLs sized appropriately for each role.",
      `Brand colors: ${vision.primaryColors.join(", ")}.`,
      `Headline for context: ${copy.headline}.`,
    ].join("\n"),
    user: JSON.stringify({
      stylePreset: input.stylePreset,
      niche: vision.niche,
    }),
    schema: ImageOutputSchema,
  });
}
