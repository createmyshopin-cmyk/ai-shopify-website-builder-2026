import type { SectionFamily } from "../types/index-types.js";
import type {
  SectionCatalog,
  SectionCompatibilityScores,
  SectionFlowRules,
  SectionMetadata,
  RuntimeIntelligence,
} from "../types/catalog-types.js";
import type { TokenRefs } from "../types/token-types.js";
import type { BaseThemeSection } from "./build-base-theme-catalog.js";

// ─── L2: Build Section Catalogs ───────────────────────────────────────────────
// Every SectionCatalog entry is derived from BaseThemeSection — the parsed schema
// from the actual .liquid file. No inference from LlmSectionInput.

// ── Section Family Classifier ─────────────────────────────────────────────────
// Maps exact section handles to their semantic families.
// Based on Horizon Pro 2.7.0 section scan.

const SECTION_FAMILY_MAP: Record<string, SectionFamily> = {
  // Hero family
  "editorial-hero":          "hero",
  "hero-split":              "hero",
  "hero-wave":               "hero",
  "media-slideshow-banner":  "hero",
  "premium-hero-banner":     "hero",

  // Products family
  "featured-product-grid-v2":   "products",
  "editorial-collection-grid":  "products",
  "bestsellers-row":            "products",
  "ai-featured-products-grid":  "products",
  "collection-showcase-v2":     "products",
  "featured-collection":        "products",
  "featured-product":           "products",
  "product-recommendations":    "products",
  "ai-product-recommendations": "products",
  "collection-list":            "products",
  "multicolumn":                "products",

  // Social proof
  "editorial-testimonials":  "social_proof",
  "customer-reviews-v2":     "social_proof",
  "testimonials-slider":     "social_proof",
  "editorial-ugc-strip":     "social_proof",

  // FAQ
  "faq-v2":       "faq",
  "faq-v3":       "faq",
  "faq-product":  "faq",

  // Trust
  "editorial-trust-bar":  "trust",
  "trust-badges-v4":      "trust",
  "trust-icons-row":      "trust",

  // Lead capture
  "editorial-newsletter":  "lead_capture",
  "newsletter-signup":     "lead_capture",
  "newsletter-signup-v2":  "lead_capture",
  "email-signup-banner":   "lead_capture",
  "popup":                 "lead_capture",

  // Storytelling
  "brand-story":                  "storytelling",
  "editorial-brand-story":        "storytelling",
  "product-storytelling-v2":      "storytelling",
  "editorial-promo-banner":       "storytelling",
  "about-us":                     "storytelling",
  "rich-text":                    "storytelling",
  "image-with-text":              "storytelling",
  "image-banner":                 "storytelling",

  // Content
  "benefits":               "content",
  "benefits-swap":          "content",
  "editorial-marquee":      "content",
  "collapsible-content":    "content",
  "contact-form":           "content",
  "video":                  "content",
  "main-blog":              "content",
  "main-article":           "content",

  // Urgency / Promotion
  "announcement-bar":       "urgency",
  "promo-bar":              "urgency",

  // Navigation
  "header":                 "navigation",
  "breadcrumbs":            "navigation",

  // Footer
  "footer":                 "footer",
};

function getFamily(handle: string): SectionFamily {
  return SECTION_FAMILY_MAP[handle] ?? "content";
}

// ── Role Classifier ───────────────────────────────────────────────────────────

function getRole(family: SectionFamily): SectionCatalog["section_role"] {
  switch (family) {
    case "hero":         return "hero";
    case "social_proof": return "social_proof";
    case "trust":        return "social_proof";
    case "navigation":   return "navigation";
    case "products":
    case "urgency":
    case "lead_capture": return "conversion";
    default:             return "content";
  }
}

// ── Category Classifier ───────────────────────────────────────────────────────

function getCategory(family: SectionFamily): string {
  switch (family) {
    case "hero":         return "hero";
    case "products":     return "products";
    case "social_proof": return "social_proof";
    case "trust":        return "trust";
    case "faq":          return "faq";
    case "lead_capture": return "lead_capture";
    case "storytelling": return "storytelling";
    case "content":      return "content";
    case "urgency":      return "urgency";
    case "navigation":   return "navigation";
    case "footer":       return "footer";
    case "promotion":    return "promotion";
  }
}

// ── Priority Score ────────────────────────────────────────────────────────────

function getPriorityScore(handle: string, family: SectionFamily): number {
  // Core sections used in all presets get highest priority
  const CORE_SECTIONS: Record<string, number> = {
    "editorial-hero":            95,
    "editorial-newsletter":      90,
    "editorial-testimonials":    88,
    "editorial-trust-bar":       85,
    "faq-v2":                    83,
    "benefits":                  82,
    "featured-product-grid-v2":  80,
    "editorial-collection-grid": 78,
    "collection-showcase-v2":    75,
    "editorial-promo-banner":    72,
    "editorial-ugc-strip":       70,
    "brand-story":               68,
  };
  if (CORE_SECTIONS[handle] !== undefined) return CORE_SECTIONS[handle];

  // Fallback by family
  switch (family) {
    case "hero":         return 90;
    case "products":     return 75;
    case "trust":        return 70;
    case "social_proof": return 65;
    case "lead_capture": return 65;
    case "faq":          return 60;
    case "content":      return 55;
    case "storytelling": return 50;
    case "urgency":      return 70;
    case "navigation":   return 30;
    case "footer":       return 40;
    case "promotion":    return 55;
  }
}

// ── Required Flag ─────────────────────────────────────────────────────────────

const REQUIRED_HANDLES = new Set([
  "editorial-hero",
  "editorial-newsletter",
  "editorial-testimonials",
  "editorial-trust-bar",
  "faq-v2",
  "benefits",
  "featured-product-grid-v2",
  "editorial-collection-grid",
  "collection-showcase-v2",
  "brand-story",
  "editorial-ugc-strip",
]);

// ── Compatibility Scores ──────────────────────────────────────────────────────

const COMPATIBILITY_BY_FAMILY: Record<SectionFamily, SectionCompatibilityScores> = {
  hero:         { high_converting: 95, fashion: 90, minimal_modern: 85 },
  products:     { high_converting: 85, fashion: 70, minimal_modern: 80 },
  trust:        { high_converting: 95, fashion: 60, minimal_modern: 40 },
  social_proof: { high_converting: 80, fashion: 75, minimal_modern: 50 },
  urgency:      { high_converting: 90, fashion: 20, minimal_modern: 15 },
  storytelling: { high_converting: 40, fashion: 100, minimal_modern: 50 },
  content:      { high_converting: 65, fashion: 60, minimal_modern: 75 },
  lead_capture: { high_converting: 80, fashion: 65, minimal_modern: 65 },
  faq:          { high_converting: 70, fashion: 45, minimal_modern: 80 },
  footer:       { high_converting: 80, fashion: 80, minimal_modern: 80 },
  navigation:   { high_converting: 50, fashion: 50, minimal_modern: 50 },
  promotion:    { high_converting: 75, fashion: 55, minimal_modern: 30 },
};

// ── Flow Rules ────────────────────────────────────────────────────────────────

const FLOW_RULES_BY_FAMILY: Record<SectionFamily, SectionFlowRules> = {
  hero: {
    allowed_before: [],
    allowed_after: ["products", "trust", "social_proof", "urgency", "storytelling", "content", "lead_capture", "faq", "footer", "promotion"],
    recommended_before: [],
    recommended_after: ["products", "trust", "content"],
  },
  products: {
    allowed_before: ["hero", "trust", "storytelling", "content", "promotion", "urgency"],
    allowed_after: ["social_proof", "trust", "urgency", "faq", "lead_capture", "footer", "products", "content"],
    recommended_before: ["hero", "content"],
    recommended_after: ["social_proof", "trust"],
  },
  trust: {
    allowed_before: ["hero", "products", "content", "promotion"],
    allowed_after: ["products", "social_proof", "faq", "lead_capture", "footer"],
    recommended_before: ["products"],
    recommended_after: ["lead_capture", "footer"],
  },
  social_proof: {
    allowed_before: ["hero", "products", "trust", "content"],
    allowed_after: ["trust", "faq", "lead_capture", "footer", "urgency"],
    recommended_before: ["products"],
    recommended_after: ["faq", "lead_capture"],
  },
  urgency: {
    allowed_before: ["hero", "products", "social_proof", "trust"],
    allowed_after: ["lead_capture", "footer"],
    recommended_before: ["products", "social_proof"],
    recommended_after: ["lead_capture"],
  },
  storytelling: {
    allowed_before: ["hero", "content", "promotion"],
    allowed_after: ["products", "social_proof", "lead_capture", "faq", "footer"],
    recommended_before: ["hero"],
    recommended_after: ["products"],
  },
  content: {
    allowed_before: ["hero", "storytelling", "promotion", "content"],
    allowed_after: ["products", "social_proof", "trust", "faq", "lead_capture", "footer"],
    recommended_before: ["hero"],
    recommended_after: ["products"],
  },
  lead_capture: {
    allowed_before: ["hero", "products", "social_proof", "trust", "faq", "urgency", "storytelling", "content"],
    allowed_after: ["footer"],
    recommended_before: ["social_proof", "faq"],
    recommended_after: ["footer"],
  },
  faq: {
    allowed_before: ["hero", "products", "social_proof", "trust", "content", "storytelling"],
    allowed_after: ["lead_capture", "footer"],
    recommended_before: ["products", "social_proof"],
    recommended_after: ["lead_capture"],
  },
  footer: {
    allowed_before: ["hero", "products", "trust", "social_proof", "urgency", "storytelling", "content", "lead_capture", "faq", "navigation", "promotion"],
    allowed_after: [],
    recommended_before: ["lead_capture"],
    recommended_after: [],
  },
  navigation: {
    allowed_before: [],
    allowed_after: ["hero", "products", "trust", "social_proof", "urgency", "storytelling", "content", "lead_capture", "faq", "footer"],
    recommended_before: [],
    recommended_after: ["hero"],
  },
  promotion: {
    allowed_before: ["hero", "navigation"],
    allowed_after: ["hero", "products", "content", "storytelling"],
    recommended_before: ["hero"],
    recommended_after: ["products"],
  },
};

// ── Token Refs ────────────────────────────────────────────────────────────────
// Uses EXACT Base Theme setting IDs from settings_schema.json

function inferTokenRefs(family: SectionFamily): TokenRefs {
  const base: TokenRefs = {
    colors:     ["primary", "background", "foreground"],
    typography: ["type_heading_font", "type_body_font"],
    spacing:    ["card_gap"],
    radius:     ["global_border_radius"],
    shadows:    ["card_shadow"],
    buttons:    [],
    animations: ["card_hover_effect"],
  };

  if (family === "hero") {
    return {
      ...base,
      colors:     ["primary", "background", "foreground_heading", "primary_button_background"],
      typography: ["type_heading_font", "type_body_font", "type_size_h2"],
      spacing:    ["card_gap", "page_width"],
      buttons:    ["primary_button_background", "primary_button_text", "button_shape"],
    };
  }
  if (family === "products") {
    return {
      ...base,
      colors:     ["primary", "background", "background_secondary"],
      typography: ["type_heading_font", "type_body_font", "type_size_h2"],
      radius:     ["global_border_radius", "card_2_border_radius"],
      buttons:    ["primary_button_background", "primary_button_text"],
    };
  }
  if (family === "lead_capture") {
    return {
      ...base,
      buttons: ["primary_button_background", "primary_button_text", "button_shape"],
    };
  }
  if (family === "trust") {
    return {
      ...base,
      colors: ["primary", "background", "foreground"],
    };
  }

  return base;
}

// ── Runtime Intelligence ──────────────────────────────────────────────────────

function deriveRuntimeIntelligence(
  handle: string,
  family: SectionFamily,
  maxBlocks: number | null,
): RuntimeIntelligence {
  // Hero sections are critical — they must be LCP
  if (family === "hero") {
    return {
      performance_tier: "critical",
      lcp_risk: "high",
      cls_risk: maxBlocks !== null && maxBlocks >= 8 ? "medium" : "low",
      lazy_load_strategy: "eager",
      preload_asset: true,
      core_web_vitals_target: "lcp",
    };
  }

  // Footer / newsletter are lazy-loaded
  if (family === "footer" || family === "lead_capture") {
    return {
      performance_tier: "lazy",
      lcp_risk: "low",
      cls_risk: "low",
      lazy_load_strategy: "defer",
      preload_asset: false,
      core_web_vitals_target: null,
    };
  }

  // Navigation is always eager
  if (family === "navigation") {
    return {
      performance_tier: "critical",
      lcp_risk: "medium",
      cls_risk: "medium",
      lazy_load_strategy: "eager",
      preload_asset: false,
      core_web_vitals_target: "cls",
    };
  }

  // Image-heavy sections with many blocks
  const isImageHeavy = (maxBlocks !== null && maxBlocks >= 8) ||
    handle.includes("slideshow") || handle.includes("ugc") || handle.includes("showcase");

  if (isImageHeavy) {
    return {
      performance_tier: "standard",
      lcp_risk: "medium",
      cls_risk: "medium",
      lazy_load_strategy: "viewport",
      preload_asset: false,
      core_web_vitals_target: "cls",
    };
  }

  // Text-only sections (no images expected)
  if (family === "faq" || family === "content" || handle === "benefits" || handle === "benefits-swap") {
    return {
      performance_tier: "standard",
      lcp_risk: "low",
      cls_risk: "low",
      lazy_load_strategy: "viewport",
      preload_asset: false,
      core_web_vitals_target: null,
    };
  }

  // Default standard
  return {
    performance_tier: "standard",
    lcp_risk: "low",
    cls_risk: "low",
    lazy_load_strategy: "viewport",
    preload_asset: false,
    core_web_vitals_target: null,
  };
}

// ── Metadata Helpers ──────────────────────────────────────────────────────────

function inferLayout(handle: string, family: SectionFamily): SectionMetadata["layout"] {
  const h = handle.toLowerCase();

  if (family === "hero" || h.includes("banner")) {
    return {
      desktop_layout: "full-width-image",
      tablet_layout: "full-width-stack",
      mobile_layout: "full-width-stack",
      alignment_rules: "heading-center, cta-center",
      content_hierarchy: "image-first",
    };
  }
  if (h.includes("split") || h.includes("storytelling") || h.includes("brand-story")) {
    return {
      desktop_layout: "split-50-50",
      tablet_layout: "full-width-stack",
      mobile_layout: "full-width-stack",
      alignment_rules: "heading-left, cta-left",
      content_hierarchy: "headline-first",
    };
  }
  if (family === "products") {
    return {
      desktop_layout: "3-column-grid",
      tablet_layout: "2-column-grid",
      mobile_layout: "1-column-stack",
      alignment_rules: "heading-center, products-left",
      content_hierarchy: "headline-first",
    };
  }
  if (family === "social_proof") {
    return {
      desktop_layout: "3-column-cards",
      tablet_layout: "2-column-cards",
      mobile_layout: "1-column-stack",
      alignment_rules: "heading-center, cards-center",
      content_hierarchy: "headline-first",
    };
  }
  if (family === "faq") {
    return {
      desktop_layout: "single-column-accordion",
      tablet_layout: "single-column-accordion",
      mobile_layout: "single-column-accordion",
      alignment_rules: "heading-left, items-left",
      content_hierarchy: "headline-first",
    };
  }

  return {
    desktop_layout: "content-centered",
    tablet_layout: "content-centered",
    mobile_layout: "content-stacked",
    alignment_rules: "heading-center",
    content_hierarchy: "headline-first",
  };
}

function inferSpacingFromSettings(settings: BaseThemeSection["settings"]): SectionMetadata["spacing"] {
  let paddingTop = 60;
  let paddingBottom = 60;

  for (const s of settings) {
    const id = s.id.toLowerCase();
    if (s.type === "range" || s.type === "number") {
      if (id.includes("padding_top"))    paddingTop = 60;
      else if (id.includes("padding_bottom")) paddingBottom = 60;
    }
  }

  return {
    section_padding_top: paddingTop,
    section_padding_bottom: paddingBottom,
    block_spacing: 20,
    grid_spacing: 20,
    image_spacing: 16,
  };
}

function buildMetadata(
  section: BaseThemeSection,
  family: SectionFamily,
  colorTokens: Record<string, string>,
): SectionMetadata {
  return {
    identity: {
      merchant_goal: `Display ${section.schema_name}`,
      conversion_goal: family === "hero" ? "Awareness"
        : family === "products" ? "Intent"
          : family === "lead_capture" || family === "urgency" ? "Decision"
            : "Consideration",
    },
    layout: inferLayout(section.handle, family),
    spacing: inferSpacingFromSettings(section.settings),
    typography: {
      // Use real Base Theme setting IDs
      heading_font: "type_heading_font",
      subheading_font: "type_subheading_font",
      body_font: "type_body_font",
      heading_size: family === "hero" ? "type_size_h2" : "type_size_h3",
      subheading_size: "type_size_h3",
      body_size: "type_size_paragraph",
      font_weight: "700",
      line_height: "1.5",
      letter_spacing: "0em",
    },
    colorSystem: {
      background_color: colorTokens["background"]         ?? "#fafaf8",
      text_color:       colorTokens["foreground"]          ?? "#1a1815",
      heading_color:    colorTokens["foreground_heading"]  ?? "#1a1815",
      secondary_text_color: colorTokens["foreground"]     ?? "#1a1815",
      accent_color:     colorTokens["primary"]             ?? "#2d1b4e",
      border_color:     colorTokens["border"]              ?? "rgba(26, 24, 21, 0.08)",
    },
    buttons: {
      primary_button_color:      colorTokens["primary_button_background"]  ?? "#2d1b4e",
      primary_button_text_color: colorTokens["primary_button_text"]        ?? "#ffffff",
      secondary_button_color:    colorTokens["secondary_button_background"]?? "#6b6460",
    },
    cards: {
      border_radius: 8,
      shadow_style: "medium",
      elevation: "default",
      hover_effect: "lift",
    },
    animation: {
      reveal_animation: family === "hero" ? "slide-up" : "fade-in",
      hover_animation: family === "products" ? "lift" : "none",
      transition_duration: 300,
    },
    image: {
      image_ratio: section.settings.some((s) => s.id.includes("ratio")) ? "4/3" : "16/9",
      image_shape: "rounded",
      image_treatment: family === "hero" ? "full-bleed" : "none",
    },
    commerce: {
      product_card_style: family === "products" ? "default" : "none",
      price_style: "standard",
      badge_style: "pill",
      discount_style: "percentage",
      add_to_cart_style: family === "products" ? "button" : "none",
    },
    trust: {
      ratings:      section.blocks.some((b) => b.type.includes("review") || b.type.includes("rating")),
      reviews:      section.blocks.some((b) => b.type.includes("review") || b.type.includes("testimonial")),
      trust_badges: section.blocks.some((b) => b.type.includes("trust") || b.type.includes("badge")),
      guarantees:   section.settings.some((s) => s.id.includes("guarantee") || s.id.includes("warranty")),
    },
    seo: {
      semantic_role: family === "hero" ? "banner" : family === "products" ? "main" : "region",
      heading_hierarchy: family === "hero" ? "h1" : "h2",
      accessibility_rules: family === "hero" ? "landmark-banner, alt-required" : "landmark-region, alt-required",
    },
  };
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export function buildSectionCatalog(
  section: BaseThemeSection,
  colorTokens: Record<string, string> = {},
): SectionCatalog {
  const family = getFamily(section.handle);
  const role = getRole(family);
  const category = getCategory(family);

  return {
    section_id:   section.handle,
    section_type: section.handle,
    section_path: section.path,
    section_schema_name: section.schema_name,
    section_category: category,
    section_role: role,
    section_family: family,
    section_max_blocks: section.max_blocks,
    section_presets_raw: section.presets,
    section_settings_raw: section.settings.map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
    })),
    section_blocks_raw: section.blocks.map((b) => ({
      type: b.type,
      settings: b.settings.map((s) => ({ id: s.id, type: s.type })),
    })),
    priority_score: getPriorityScore(section.handle, family),
    required: REQUIRED_HANDLES.has(section.handle),
    name: section.schema_name,
    purpose: `${section.schema_name} section — ${category}`,
    metadata: buildMetadata(section, family, colorTokens),
    compatibility_scores: COMPATIBILITY_BY_FAMILY[family] ?? { high_converting: 50, fashion: 50, minimal_modern: 50 },
    token_refs: inferTokenRefs(family),
    flow_rules: FLOW_RULES_BY_FAMILY[family] ?? {
      allowed_before: [],
      allowed_after: [],
      recommended_before: [],
      recommended_after: [],
    },
    runtime_intelligence: deriveRuntimeIntelligence(section.handle, family, section.max_blocks),
  };
}

// ─── Batch Builder ────────────────────────────────────────────────────────────

export function buildAllSectionCatalogs(
  sections: BaseThemeSection[],
  colorTokens: Record<string, string> = {},
): SectionCatalog[] {
  return sections.map((section) => buildSectionCatalog(section, colorTokens));
}
