import type { LandingPageRecipe } from "./types.js";

/** Static landing page recipes — filtered against available section types at build time */
export const LANDING_PAGE_RECIPE_DEFINITIONS: Array<{
  id: string;
  name: string;
  description: string;
  stylePresets: string[];
  sectionOrder: string[];
}> = [
  {
    id: "editorial-dtc",
    name: "Editorial DTC",
    description:
      "Full editorial homepage: hero, marquee, brand story, collections, storytelling, UGC, testimonials, trust, newsletter, products, promo, lifestyle, urgency",
    stylePresets: ["fashion", "high-converting"],
    sectionOrder: [
      "editorial-hero",
      "editorial-marquee",
      "brand-story",
      "editorial-collection-grid",
      "product-storytelling-v2",
      "editorial-ugc-strip",
      "editorial-testimonials",
      "editorial-trust-bar",
      "editorial-newsletter",
      "bestsellers-row",
      "editorial-promo-banner",
      "lifestyle-with-waves",
      "urgency-countdown",
    ],
  },
  {
    id: "high-converting",
    name: "High Converting",
    description:
      "Conversion-focused flow: hero, trust, products, social proof, urgency, newsletter, promo CTA",
    stylePresets: ["high-converting"],
    sectionOrder: [
      "editorial-hero",
      "editorial-trust-bar",
      "bestsellers-row",
      "editorial-testimonials",
      "urgency-countdown",
      "editorial-newsletter",
      "editorial-promo-banner",
    ],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean minimal homepage: hero, product grid, newsletter",
    stylePresets: ["minimal"],
    sectionOrder: [
      "editorial-hero",
      "featured-product-grid-v2",
      "editorial-newsletter",
    ],
  },
  {
    id: "fashion-editorial",
    name: "Fashion Editorial",
    description:
      "Fashion and apparel: hero, marquee, brand story, UGC, products, testimonials",
    stylePresets: ["fashion"],
    sectionOrder: [
      "editorial-hero",
      "editorial-marquee",
      "brand-story",
      "editorial-ugc-strip",
      "bestsellers-row",
      "editorial-testimonials",
    ],
  },
];

export function buildLandingPageRecipes(
  availableSectionTypes: Set<string>,
): LandingPageRecipe[] {
  return LANDING_PAGE_RECIPE_DEFINITIONS.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    stylePresets: recipe.stylePresets,
    sectionOrder: recipe.sectionOrder.filter((type) =>
      availableSectionTypes.has(type),
    ),
  })).filter((recipe) => recipe.sectionOrder.length > 0);
}

export function pickRecipeForPreset(
  recipes: LandingPageRecipe[],
  stylePreset: string,
): LandingPageRecipe | undefined {
  const match = recipes.find((r) => r.stylePresets.includes(stylePreset));
  return match ?? recipes[0];
}
