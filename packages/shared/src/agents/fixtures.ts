import type { AgentOutputs } from "./types.js";

/** Golden fixture for unit tests and MOCK_AI mode */
export const GOLDEN_AGENT_OUTPUTS: AgentOutputs = {
  vision: {
    niche: "Premium activewear",
    productSummary: "Performance-focused apparel with moisture-wicking fabrics.",
    primaryColors: ["#1a1a1a", "#f5f5f5", "#c9a227"],
    tone: "confident and energetic",
    targetAudience: "fitness-conscious millennials",
  },
  copy: {
    headline: "Move Better. Feel Stronger.",
    subheadline: "Engineered for your hardest workouts.",
    benefits: [
      "Breathable four-way stretch",
      "Sweat-wicking all day",
      "Designed for gym and street",
    ],
    faq: [
      {
        question: "What is the return policy?",
        answer: "30-day hassle-free returns on unworn items.",
      },
      {
        question: "How do I choose a size?",
        answer: "Use our size guide; size up for a relaxed fit.",
      },
    ],
    cta: "Shop the collection",
    seoTitle: "Premium Activewear | Performance Apparel",
    seoDescription:
      "Shop moisture-wicking activewear designed for training and everyday comfort.",
  },
  image: {
    assets: [
      {
        role: "hero",
        prompt: "Athletic model in minimalist studio, dramatic lighting",
        altText: "Hero banner showcasing premium activewear",
        placeholderUrl: "https://placehold.co/1600x900/1a1a1a/f5f5f5?text=Hero",
      },
      {
        role: "lifestyle",
        prompt: "Group workout in urban gym environment",
        altText: "Lifestyle shot of athletes training together",
        placeholderUrl:
          "https://placehold.co/1200x800/1a1a1a/f5f5f5?text=Lifestyle",
      },
    ],
  },
  layout: {
    sectionOrder: [
      "editorial-hero",
      "featured-product-grid-v2",
      "faq-v2",
      "section",
    ],
    spacingScale: "balanced",
    hierarchyNotes: "Hero first, social proof mid-page, FAQ before footer.",
    heroSectionType: "editorial-hero",
  },
  compiler: {
    indexJson: {
      sections: {
        hero: { type: "editorial-hero", settings: { heading: "Move Better." } },
        featured: {
          type: "featured-product-grid-v2",
          settings: {},
        },
      },
      order: ["hero", "featured"],
    },
    settingsPatch: { color_primary: "#1a1a1a" },
    cssVariables: { "--color-primary": "#1a1a1a" },
  },
  validation: {
    passed: true,
    issues: [],
  },
};
