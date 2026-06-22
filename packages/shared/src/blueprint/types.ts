import { z } from "zod";

export const BlueprintSectionSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  settings: z.array(z.string()),
  blocks: z.array(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      settings: z.array(z.string()),
    }),
  ),
});

export const ThemeBlueprintSchema = z.object({
  themeName: z.string().optional(),
  themeVersion: z.string().optional(),
  sourcePath: z.string(),
  sections: z.array(BlueprintSectionSchema),
  blocks: z.array(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      settings: z.array(z.string()),
    }),
  ),
  fonts: z.array(z.string()),
  colors: z.array(z.string()),
  css_variables: z.array(z.string()),
  settings: z.array(z.string()),
  spacing_rules: z.array(z.string()),
  radius_rules: z.array(z.string()),
  templateSectionOrder: z.array(z.string()).optional(),
});

export type ThemeBlueprint = z.infer<typeof ThemeBlueprintSchema>;

export type SectionSchemaJson = {
  name?: string;
  settings?: Array<{
    id?: string;
    type?: string;
    label?: string;
    default?: unknown;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    info?: string;
    options?: Array<{ value?: string; label?: string }>;
  }>;
  blocks?: Array<{
    type: string;
    name?: string;
    settings?: Array<{
      id?: string;
      type?: string;
      label?: string;
      default?: unknown;
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
    }>;
  }>;
  max_blocks?: number;
  presets?: Array<{
    name?: string;
    settings?: Record<string, unknown>;
    blocks?: Array<{ type: string; settings?: Record<string, unknown> }>;
  }>;
};
