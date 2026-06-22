import { z } from "zod";

import {
  CopyOutputSchema,
  ImageOutputSchema,
  LayoutOutputSchema,
  VisionOutputSchema,
} from "../agents/types.js";
import { ThemeBlueprintSchema } from "../blueprint/types.js";

export const CompilerInputSchema = z.object({
  projectId: z.string().uuid(),
  shop: z.string(),
  productIds: z.array(z.string()),
  stylePreset: z.string(),
  blueprint: ThemeBlueprintSchema,
  vision: VisionOutputSchema,
  copy: CopyOutputSchema,
  layout: LayoutOutputSchema,
  image: ImageOutputSchema,
  products: z.array(z.unknown()).optional(),
});

export type CompilerInput = z.infer<typeof CompilerInputSchema>;

export const CompiledThemeOutputSchema = z.object({
  indexJson: z.object({
    sections: z.record(z.unknown()),
    order: z.array(z.string()),
  }),
  settingsData: z.record(z.unknown()),
  cssVariables: z.record(z.string()),
  sections: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      settings: z.record(z.unknown()),
    }),
  ),
});

export type CompiledThemeOutput = z.infer<typeof CompiledThemeOutputSchema>;
