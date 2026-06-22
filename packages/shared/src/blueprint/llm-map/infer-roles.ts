import type { SectionCategory, SectionFamily, SectionRole, SettingRole } from "./types.js";

const SKIP_SETTING_TYPES = new Set(["header", "paragraph", "html"]);

export function shouldIncludeSetting(settingType: string | undefined): boolean {
  if (!settingType) {
    return false;
  }
  return !SKIP_SETTING_TYPES.has(settingType);
}

export function inferSettingRole(
  id: string,
  type: string,
): SettingRole {
  const lower = id.toLowerCase();

  if (type === "color_scheme") {
    return "color_scheme";
  }
  if (type === "image_picker" || lower.includes("image") || lower === "logo") {
    return "image";
  }
  if (type === "video" || type === "video_url" || lower.includes("video")) {
    return "video";
  }
  if (type === "collection" || lower.includes("collection")) {
    return "collection";
  }
  if (type === "product" || lower === "product" || lower.includes("product_list")) {
    return "product";
  }
  if (type === "url" || lower.endsWith("_link") || lower.endsWith("_url")) {
    return "url";
  }
  if (type === "checkbox") {
    return "boolean";
  }
  if (type === "color") {
    if (lower.includes("button") && lower.includes("text")) {
      return "button_text";
    }
    if (lower.includes("button")) {
      return "button_background";
    }
    return "color";
  }
  if (type === "richtext" || type === "inline_richtext") {
    return "richtext";
  }
  if (
    lower.includes("heading") ||
    lower === "headline" ||
    lower === "title" ||
    lower === "eyebrow"
  ) {
    return "headline";
  }
  if (
    lower.includes("subheading") ||
    lower.includes("subtitle") ||
    lower === "description" ||
    lower.includes("intro") ||
    lower.includes("subtext")
  ) {
    return "subheadline";
  }
  if (
    lower.includes("button_label") ||
    lower.includes("button_text") ||
    lower === "cta" ||
    lower.includes("cta_")
  ) {
    return "cta";
  }
  if (lower.includes("padding") || lower.includes("spacing") || lower.includes("gap")) {
    return "spacing";
  }
  if (
    lower.includes("height") ||
    lower.includes("width") ||
    lower.includes("size") ||
    type === "range"
  ) {
    return "size";
  }
  if (type === "text") {
    return "text";
  }

  return "other";
}

export function inferSectionCategory(sectionType: string): SectionCategory {
  const t = sectionType.toLowerCase();

  if (t.includes("hero") || t.includes("banner")) {
    return "hero";
  }
  if (
    t.includes("testimonial") ||
    t.includes("review") ||
    t.includes("ugc") ||
    t.includes("as-seen")
  ) {
    return "social_proof";
  }
  if (t.includes("trust") || t.includes("guarantee")) {
    return "trust";
  }
  if (
    t.includes("product") ||
    t.includes("bestseller") ||
    t.includes("collection") ||
    t.includes("shop-by")
  ) {
    return "products";
  }
  if (t.includes("newsletter")) {
    return "lead_capture";
  }
  if (t.includes("marquee") || t.includes("countdown") || t.includes("urgency")) {
    return "urgency";
  }
  if (t.includes("faq") || t.includes("accordion")) {
    return "faq";
  }
  if (t.includes("story") || t.includes("brand") || t.includes("lifestyle")) {
    return "storytelling";
  }

  return "content";
}

const PURPOSE_BY_CATEGORY: Record<SectionCategory, string> = {
  hero: "Above-the-fold hero with imagery, headline, and primary CTA",
  social_proof: "Customer reviews, testimonials, or user-generated content",
  trust: "Trust badges, guarantees, or credibility signals",
  products: "Product grid, collection showcase, or bestsellers row",
  lead_capture: "Email newsletter signup or lead generation",
  urgency: "Countdown timer, marquee, or urgency messaging",
  faq: "Frequently asked questions or accordion content",
  storytelling: "Brand narrative, lifestyle imagery, or product storytelling",
  content: "General content section for homepage composition",
};

export function inferSectionPurpose(
  sectionType: string,
  name: string | undefined,
  category: SectionCategory,
): string {
  if (name) {
    return `${name} — ${PURPOSE_BY_CATEGORY[category]}`;
  }
  return PURPOSE_BY_CATEGORY[category];
}

export function inferRecommendedPosition(
  category: SectionCategory,
): string[] {
  switch (category) {
    case "hero":
      return ["first"];
    case "urgency":
      return ["after_hero", "before_footer"];
    case "lead_capture":
      return ["before_footer", "mid_page"];
    case "products":
      return ["mid_page", "after_storytelling"];
    case "social_proof":
      return ["mid_page", "after_products"];
    case "trust":
      return ["after_hero", "mid_page"];
    case "faq":
      return ["before_footer"];
    case "storytelling":
      return ["after_hero", "mid_page"];
    default:
      return ["mid_page"];
  }
}

export function isLandingPageSection(sectionType: string): boolean {
  const category = inferSectionCategory(sectionType);
  const excludedPrefixes = [
    "main-",
    "header",
    "footer",
    "password",
    "custom-liquid",
    "divider",
    "logo",
  ];
  if (excludedPrefixes.some((p) => sectionType.startsWith(p) || sectionType === p)) {
    return false;
  }
  if (sectionType.includes("utilities")) {
    return false;
  }
  return category !== "content" || isKnownLandingSection(sectionType);
}

export function inferSectionRole(category: SectionCategory): SectionRole {
  switch (category) {
    case "hero":
      return "hero";
    case "social_proof":
      return "social_proof";
    case "trust":
    case "products":
    case "urgency":
    case "lead_capture":
      return "conversion";
    case "faq":
    case "storytelling":
    case "content":
      return "content";
    default:
      return "content";
  }
}

export function inferSectionFamily(sectionType: string, category: SectionCategory): SectionFamily {
  const t = sectionType.toLowerCase();

  if (t === "footer" || t.endsWith("-footer") || t.includes("site-footer")) {
    return "footer";
  }
  if (t.includes("header") || t.includes("mega-menu") || t.includes("navigation") || t.includes("nav-")) {
    return "navigation";
  }
  if (t.includes("announcement") || t.includes("promo-strip") || t.includes("marquee")) {
    return "promotion";
  }
  if (t.includes("newsletter") && !t.includes("hero")) {
    return "lead_capture";
  }
  if (t.includes("faq") || t.includes("accordion") || t.includes("product-tabs")) {
    return "faq";
  }
  if (t.includes("trust") || t.includes("guarantee") || t.includes("trust-bar")) {
    return "trust";
  }
  if (
    t.includes("testimonial") ||
    t.includes("review") ||
    t.includes("ugc") ||
    t.includes("as-seen") ||
    t.includes("social-proof")
  ) {
    return "social_proof";
  }
  if (t.includes("countdown") || t.includes("urgency") || t.includes("promo-banner")) {
    return "urgency";
  }
  if (t.includes("story") || t.includes("brand") || t.includes("lifestyle") || t.includes("editorial-banner")) {
    return "storytelling";
  }
  if (t.includes("hero") || t.includes("banner") || t.includes("slideshow")) {
    return "hero";
  }
  if (
    t.includes("product") ||
    t.includes("bestseller") ||
    t.includes("collection") ||
    t.includes("featured")
  ) {
    return "products";
  }
  if (t.includes("benefits") || t.includes("features") || t.includes("icon-row") || t.includes("feature-grid")) {
    return "content";
  }

  // Fall back to category-based mapping
  switch (category) {
    case "hero": return "hero";
    case "social_proof": return "social_proof";
    case "trust": return "trust";
    case "products": return "products";
    case "lead_capture": return "lead_capture";
    case "urgency": return "urgency";
    case "faq": return "faq";
    case "storytelling": return "storytelling";
    default: return "content";
  }
}

const PRIORITY_BY_CATEGORY: Record<SectionCategory, number> = {
  hero: 100,
  trust: 75,
  social_proof: 80,
  products: 85,
  lead_capture: 70,
  urgency: 65,
  faq: 60,
  storytelling: 70,
  content: 55,
};

export function inferPriorityScore(sectionType: string, category: SectionCategory): number {
  const t = sectionType.toLowerCase();
  // Boost known high-value sections
  if (t === "editorial-hero" || t === "editorial-newsletter") return 100;
  if (t.includes("trust-bar") || t.includes("trust-badge")) return 90;
  if (t.includes("testimonial") || t.includes("review")) return 82;
  if (t.includes("bestseller") || t.includes("featured-product")) return 88;
  return PRIORITY_BY_CATEGORY[category] ?? 55;
}

export function inferRequired(sectionType: string, family: SectionFamily): boolean {
  const t = sectionType.toLowerCase();
  if (t === "editorial-hero" || family === "hero") return true;
  if (family === "footer") return true;
  return false;
}

function isKnownLandingSection(sectionType: string): boolean {
  const known = new Set([
    "editorial-hero",
    "editorial-marquee",
    "editorial-collection-grid",
    "editorial-product-row",
    "editorial-promo-banner",
    "editorial-headline",
    "editorial-video",
    "editorial-product-grid",
    "editorial-brand-story",
    "editorial-used-by",
    "media-with-content",
    "marquee",
    "horizontal-scrolling-text",
    "photo-with-text",
    "image-split",
    "hero-split",
    "hero-wave",
    "hero-collection-grid",
    "benefits",
    "benefits-swap",
    "guarantee-banner",
    "whatsapp-float",
    "shoppable-video",
    "shop-by-categories",
    "shop-by-age",
    "category-navigation",
    "collection-links",
    "collection-fancy",
    "collection-cards",
    "collection-showcase-v2",
    "collections-carousel",
    "collections-slider-v2",
    "comparison-v2",
    "comparison-v3",
    "comparison-waves",
    "before-after-slider",
    "brand-comparison",
    "how-to-use",
    "key-ingredients",
    "neeloos",
    "neeloos-strip",
    "neeloos-family",
    "neeloos-video",
    "neeloos-ingredients",
    "neeloos-reviews",
    "neeloos-you-may-also-like",
    "neeloss-help",
    "pastel-hero-2",
    "pastel-ingredients",
    "pastel-pure-ingredients",
    "pastel-product-social-ugc",
    "premium-hero-banner",
    "premium-split-layout",
    "premium-reviews",
    "luxury-lifestyle",
    "luxury-product-features",
    "luxury-product-showcase",
    "luxury-testimonials",
    "luxury-waves",
    "skincare-media-carousel",
    "wave-product-features",
    "rotating-quotes",
    "promotional-banners",
    "service-promo-banner",
    "vertical-photo-grid",
    "social-proof-with-results",
    "focus-product-review",
    "forge-reviews",
    "homepage-product",
    "ai-featured-products-grid",
    "discount-countdown",
    "product-tabs-v2",
    "product-storytelling",
    "product-storytelling-v2",
    "reviews-with-image",
    "faq-with-image",
    "faq-v2",
    "faq-v3",
    "faq-waves",
    "faq-product",
    "featured-blog-posts",
    "featured-posts",
    "featured-product",
    "featured-products-grid",
    "featured-product-grid-v2",
    "customer-reviews-v2",
    "editorial-testimonials",
    "editorial-trust-bar",
    "editorial-ugc-strip",
    "editorial-newsletter",
    "editorial-accordion",
    "bestsellers-row",
    "brand-story",
    "lifestyle-with-waves",
    "urgency-countdown",
  ]);
  return known.has(sectionType);
}
