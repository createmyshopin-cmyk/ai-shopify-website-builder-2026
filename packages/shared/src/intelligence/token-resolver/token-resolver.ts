import type { AllDesignTokens, TokenRefs, ResolvedTokens } from "../types/token-types.js";

// ─── Token Resolver ───────────────────────────────────────────────────────────
// Synchronous facade — resolves real Base Theme setting IDs against loaded
// token catalogs. Token IDs are EXACT Shopify setting IDs (e.g. "primary",
// "type_heading_font") — never invented names.

export class TokenResolver {
  private readonly tokens: AllDesignTokens;

  constructor(tokens: AllDesignTokens) {
    this.tokens = tokens;
  }

  static fromTokens(tokens: AllDesignTokens): TokenResolver {
    return new TokenResolver(tokens);
  }

  /**
   * Resolves a single token ID to its value.
   * Searches all token categories in order.
   *
   * @param tokenId Exact Shopify setting ID (e.g. "primary", "type_heading_font")
   * @returns The token value, or undefined if not found
   */
  resolve(tokenId: string): string | number | boolean | undefined {
    for (const category of Object.values(this.tokens)) {
      const val = (category as Record<string, unknown>)[tokenId];
      if (val !== undefined) return val as string | number | boolean;
    }
    return undefined;
  }

  /**
   * Resolves multiple token IDs, returning only those found.
   */
  resolveMany(tokenIds: string[]): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    for (const id of tokenIds) {
      const val = this.resolve(id);
      if (val !== undefined) result[id] = val;
    }
    return result;
  }

  /**
   * Resolves all token_refs for a section or preset into a flat map
   * of tokenId → value.
   */
  resolveRefs(refs: TokenRefs): Record<string, string | number | boolean> {
    const allIds = [
      ...refs.colors,
      ...refs.typography,
      ...refs.spacing,
      ...refs.radius,
      ...refs.shadows,
      ...refs.buttons,
      ...refs.animations,
    ];
    return this.resolveMany(allIds);
  }

  /**
   * Returns the full resolved token set, preserving category structure.
   * Only includes keys that exist in the provided token_refs.
   */
  resolveStructured(refs: TokenRefs): ResolvedTokens {
    const pickStrings = (category: Record<string, unknown>, ids: string[]): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const id of ids) {
        const val = category[id];
        if (val !== undefined) result[id] = String(val);
      }
      return result;
    };

    const pickMixed = (category: Record<string, unknown>, ids: string[]): Record<string, string | number> => {
      const result: Record<string, string | number> = {};
      for (const id of ids) {
        const val = category[id];
        if (val !== undefined) {
          result[id] = typeof val === "number" ? val : String(val);
        }
      }
      return result;
    };

    return {
      colors:     pickStrings(this.tokens.colors     as Record<string, unknown>, refs.colors),
      typography: pickStrings(this.tokens.typography as Record<string, unknown>, refs.typography),
      spacing:    pickMixed(this.tokens.spacing       as Record<string, unknown>, refs.spacing),
      radius:     pickMixed(this.tokens.radius        as Record<string, unknown>, refs.radius),
      shadows:    pickStrings(this.tokens.shadows     as Record<string, unknown>, refs.shadows),
      buttons:    pickMixed(this.tokens.buttons       as Record<string, unknown>, refs.buttons),
      animations: pickStrings(this.tokens.animations  as Record<string, unknown>, refs.animations),
    };
  }

  /** Returns the entire token catalog by category */
  getTokens(): AllDesignTokens {
    return this.tokens;
  }

  /** Returns all tokens in a single flat map */
  getAllFlat(): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    for (const category of Object.values(this.tokens)) {
      for (const [id, val] of Object.entries(category as Record<string, unknown>)) {
        result[id] = val as string | number | boolean;
      }
    }
    return result;
  }
}
