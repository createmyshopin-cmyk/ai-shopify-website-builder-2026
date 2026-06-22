import type { VariantFamilyCatalog, VariantFamilyIndex } from "../types/variant-types.js";

// ─── L4: Build Variant Catalogs ───────────────────────────────────────────────
// Variants are ALTERNATE SECTION HANDLES grouped by semantic family.
// All section_type values are EXACT Base Theme handles (Horizon Pro 2.7.0).
// No sub-layout names within a section. No invented identifiers.

const HERO_VARIANTS: VariantFamilyCatalog = {
  family: "hero",
  sections: [
    { section_type: "editorial-hero",        schema_name: "Editorial Hero",         preset_scores: { "high-converting": 95, "fashion": 90, "minimal-modern": 80 } },
    { section_type: "hero-split",            schema_name: "Hero Split",             preset_scores: { "high-converting": 70, "fashion": 75, "minimal-modern": 85 } },
    { section_type: "hero-wave",             schema_name: "Hero Wave",              preset_scores: { "high-converting": 60, "fashion": 65, "minimal-modern": 50 } },
    { section_type: "media-slideshow-banner",schema_name: "Media slideshow banner", preset_scores: { "high-converting": 75, "fashion": 70, "minimal-modern": 60 } },
    { section_type: "premium-hero-banner",   schema_name: "Premium hero banner",    preset_scores: { "high-converting": 65, "fashion": 80, "minimal-modern": 55 } },
  ],
};

const PRODUCTS_VARIANTS: VariantFamilyCatalog = {
  family: "products",
  sections: [
    { section_type: "featured-product-grid-v2",  schema_name: "Featured products grid v2",  preset_scores: { "high-converting": 90, "fashion": 65, "minimal-modern": 85 } },
    { section_type: "editorial-collection-grid", schema_name: "Editorial Collections",       preset_scores: { "high-converting": 85, "fashion": 80, "minimal-modern": 60 } },
    { section_type: "bestsellers-row",           schema_name: "Bestsellers Row",            preset_scores: { "high-converting": 80, "fashion": 70, "minimal-modern": 55 } },
    { section_type: "ai-featured-products-grid", schema_name: "Featured products grid",     preset_scores: { "high-converting": 75, "fashion": 60, "minimal-modern": 50 } },
    { section_type: "collection-showcase-v2",    schema_name: "Collection showcase",         preset_scores: { "high-converting": 65, "fashion": 90, "minimal-modern": 60 } },
  ],
};

const SOCIAL_PROOF_VARIANTS: VariantFamilyCatalog = {
  family: "social_proof",
  sections: [
    { section_type: "editorial-testimonials", schema_name: "Editorial Testimonials",    preset_scores: { "high-converting": 88, "fashion": 70, "minimal-modern": 60 } },
    { section_type: "customer-reviews-v2",    schema_name: "Customer reviews v2",       preset_scores: { "high-converting": 75, "fashion": 55, "minimal-modern": 65 } },
    { section_type: "testimonials-slider",    schema_name: "Testimonials Slider",       preset_scores: { "high-converting": 70, "fashion": 65, "minimal-modern": 55 } },
    { section_type: "editorial-ugc-strip",    schema_name: "Editorial UGC Strip",       preset_scores: { "high-converting": 65, "fashion": 95, "minimal-modern": 40 } },
  ],
};

const FAQ_VARIANTS: VariantFamilyCatalog = {
  family: "faq",
  sections: [
    { section_type: "faq-v2",      schema_name: "FAQ accordion v2",     preset_scores: { "high-converting": 85, "fashion": 50, "minimal-modern": 90 } },
    { section_type: "faq-v3",      schema_name: "Premium FAQ section",  preset_scores: { "high-converting": 70, "fashion": 70, "minimal-modern": 75 } },
    { section_type: "faq-product", schema_name: "FAQ",                   preset_scores: { "high-converting": 65, "fashion": 55, "minimal-modern": 60 } },
  ],
};

const TRUST_VARIANTS: VariantFamilyCatalog = {
  family: "trust",
  sections: [
    { section_type: "editorial-trust-bar", schema_name: "Editorial Trust Bar", preset_scores: { "high-converting": 90, "fashion": 55, "minimal-modern": 45 } },
    { section_type: "trust-badges-v4",     schema_name: "Trust badges",        preset_scores: { "high-converting": 80, "fashion": 45, "minimal-modern": 40 } },
    { section_type: "trust-icons-row",     schema_name: "Trust icons row",     preset_scores: { "high-converting": 75, "fashion": 60, "minimal-modern": 50 } },
  ],
};

const LEAD_CAPTURE_VARIANTS: VariantFamilyCatalog = {
  family: "lead_capture",
  sections: [
    { section_type: "editorial-newsletter",  schema_name: "Editorial Newsletter", preset_scores: { "high-converting": 85, "fashion": 80, "minimal-modern": 80 } },
    { section_type: "newsletter-signup",     schema_name: "Newsletter signup",    preset_scores: { "high-converting": 70, "fashion": 65, "minimal-modern": 70 } },
    { section_type: "newsletter-signup-v2",  schema_name: "Newsletter signup",    preset_scores: { "high-converting": 65, "fashion": 60, "minimal-modern": 65 } },
  ],
};

const STORYTELLING_VARIANTS: VariantFamilyCatalog = {
  family: "storytelling",
  sections: [
    { section_type: "brand-story",                schema_name: "Brand storytelling",       preset_scores: { "high-converting": 45, "fashion": 95, "minimal-modern": 50 } },
    { section_type: "editorial-brand-story",      schema_name: "Editorial Brand Story",    preset_scores: { "high-converting": 40, "fashion": 90, "minimal-modern": 45 } },
    { section_type: "product-storytelling-v2",    schema_name: "Product storytelling",     preset_scores: { "high-converting": 55, "fashion": 85, "minimal-modern": 50 } },
    { section_type: "editorial-ugc-strip",        schema_name: "Editorial UGC Strip",      preset_scores: { "high-converting": 50, "fashion": 88, "minimal-modern": 35 } },
  ],
};

const CONTENT_VARIANTS: VariantFamilyCatalog = {
  family: "content",
  sections: [
    { section_type: "benefits",       schema_name: "Benefits",         preset_scores: { "high-converting": 80, "fashion": 55, "minimal-modern": 80 } },
    { section_type: "benefits-swap",  schema_name: "Benefits Swap",    preset_scores: { "high-converting": 70, "fashion": 60, "minimal-modern": 70 } },
    { section_type: "editorial-marquee", schema_name: "Editorial Marquee", preset_scores: { "high-converting": 40, "fashion": 80, "minimal-modern": 55 } },
  ],
};

export const ALL_VARIANT_FAMILIES: VariantFamilyCatalog[] = [
  HERO_VARIANTS,
  PRODUCTS_VARIANTS,
  SOCIAL_PROOF_VARIANTS,
  FAQ_VARIANTS,
  TRUST_VARIANTS,
  LEAD_CAPTURE_VARIANTS,
  STORYTELLING_VARIANTS,
  CONTENT_VARIANTS,
];

export function buildVariantFamilyCatalogs(): VariantFamilyCatalog[] {
  return ALL_VARIANT_FAMILIES;
}

export function buildVariantFamilyIndex(): VariantFamilyIndex {
  return {
    generated_at: new Date().toISOString(),
    families: ALL_VARIANT_FAMILIES,
  };
}

export function getVariantFamilyFor(family: string): VariantFamilyCatalog | undefined {
  return ALL_VARIANT_FAMILIES.find((f) => f.family === family);
}

export function getBestSectionForFamily(
  family: string,
  presetId: string,
): string | undefined {
  const catalog = getVariantFamilyFor(family);
  if (!catalog || catalog.sections.length === 0) return undefined;

  let best = catalog.sections[0];
  for (const entry of catalog.sections) {
    const score = entry.preset_scores[presetId as keyof typeof entry.preset_scores] ?? 0;
    const bestScore = best.preset_scores[presetId as keyof typeof best.preset_scores] ?? 0;
    if (score > bestScore) best = entry;
  }

  return best.section_type;
}

// ─── Legacy compat exports ────────────────────────────────────────────────────
// Kept for backward compatibility with code that imports buildVariantCatalog

export type { VariantFamilyCatalog, VariantFamilyIndex };

export function buildVariantCatalog(): Record<string, import("../types/variant-types.js").SectionVariant[]> {
  // Returns empty legacy catalog — the new model uses VariantFamilyCatalog
  return {};
}

export function getVariantsForSection(_sectionType: string): import("../types/variant-types.js").SectionVariant[] {
  return [];
}

export function getBestVariantForPreset(
  _sectionType: string,
  presetId: string,
): import("../types/variant-types.js").SectionVariant | undefined {
  return undefined;
}
