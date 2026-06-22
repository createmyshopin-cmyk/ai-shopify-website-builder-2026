import { z } from "zod";

// ─── L0: Design Token Schemas ─────────────────────────────────────────────────
// Token keys are EXACT Shopify setting IDs from settings_schema.json / settings_data.json.
// No invented names. All IDs derived from Horizon Pro 2.7.0 base theme.

export const ColorTokensSchema = z.record(z.string());
export type ColorTokens = z.infer<typeof ColorTokensSchema>;

export const TypographyTokensSchema = z.record(z.string());
export type TypographyTokens = z.infer<typeof TypographyTokensSchema>;

export const SpacingTokensSchema = z.record(z.union([z.string(), z.number()]));
export type SpacingTokens = z.infer<typeof SpacingTokensSchema>;

export const RadiusTokensSchema = z.record(z.union([z.string(), z.number()]));
export type RadiusTokens = z.infer<typeof RadiusTokensSchema>;

export const ShadowTokensSchema = z.record(z.string());
export type ShadowTokens = z.infer<typeof ShadowTokensSchema>;

export const ButtonTokensSchema = z.record(z.union([z.string(), z.number()]));
export type ButtonTokens = z.infer<typeof ButtonTokensSchema>;

export const AnimationTokensSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));
export type AnimationTokens = z.infer<typeof AnimationTokensSchema>;

// Aggregated token refs — arrays of real Shopify setting IDs that a section/preset needs
export const TokenRefsSchema = z.object({
  colors: z.array(z.string()),
  typography: z.array(z.string()),
  spacing: z.array(z.string()),
  radius: z.array(z.string()),
  shadows: z.array(z.string()),
  buttons: z.array(z.string()),
  animations: z.array(z.string()),
});

export type TokenRefs = z.infer<typeof TokenRefsSchema>;

export const ResolvedTokensSchema = z.object({
  colors: ColorTokensSchema,
  typography: TypographyTokensSchema,
  spacing: SpacingTokensSchema,
  radius: RadiusTokensSchema,
  shadows: ShadowTokensSchema,
  buttons: ButtonTokensSchema,
  animations: AnimationTokensSchema,
});

export type ResolvedTokens = z.infer<typeof ResolvedTokensSchema>;

export const AllDesignTokensSchema = z.object({
  colors: ColorTokensSchema,
  typography: TypographyTokensSchema,
  spacing: SpacingTokensSchema,
  radius: RadiusTokensSchema,
  shadows: ShadowTokensSchema,
  buttons: ButtonTokensSchema,
  animations: AnimationTokensSchema,
});

export type AllDesignTokens = z.infer<typeof AllDesignTokensSchema>;
