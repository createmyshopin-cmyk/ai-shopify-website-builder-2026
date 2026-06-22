import type { PresetCatalog } from "../types/preset-types.js";

// ─── L3: Build Preset Catalogs ────────────────────────────────────────────────
// Three canonical presets. Section handles are EXACT Base Theme filenames.
// Token refs use EXACT settings_schema.json setting IDs — no invented names.
// preferred_variant removed — VariantSelectionService chooses from variant catalog.

export const HIGH_CONVERTING_PRESET: PresetCatalog = {
  id: "high-converting",
  name: "High Converting",
  description: "Maximizes conversion through trust signals, social proof, urgency, and clear CTAs.",
  focus: ["conversion", "trust", "urgency", "social proof"],
  section_count_rules: { min_sections: 8, max_sections: 10 },
  characteristics: {
    typography_style: "bold",
    color_palette_guidance: "High contrast, strong primary CTA color, trust-building neutrals",
    spacing_scale: "compact",
    animation_intensity: "subtle",
    image_treatment: "product-focused, high quality",
    cro_emphasis: "Strong — urgency, scarcity, social proof above the fold",
  },
  copy_intelligence: {
    headline_style: "bold imperative with clear value proposition",
    description_style: "benefit-first, concise, results-oriented",
    cta_style: "direct action verbs: Shop Now, Get Yours, Claim Deal",
    social_proof_style: "specific numbers and verified reviews",
    urgency_style: "scarcity and time-limited offers where appropriate",
    emotion_style: "trustworthy and decisive",
  },
  token_refs: {
    colors:     ["primary", "background", "primary_button_background", "primary_button_text"],
    typography: ["type_heading_font", "type_body_font", "type_size_h2"],
    spacing:    ["card_gap", "page_width"],
    radius:     ["global_border_radius"],
    shadows:    ["card_shadow"],
    buttons:    ["button_shape", "primary_button_background", "primary_button_text"],
    animations: ["card_hover_effect"],
  },
  section_flow: [
    { slot: 1,  section_family: "hero",         preferred_section_type: "editorial-hero",            required: true  },
    { slot: 2,  section_family: "products",     preferred_section_type: "editorial-collection-grid", required: true  },
    { slot: 3,  section_family: "content",      preferred_section_type: "benefits",                  required: true  },
    { slot: 4,  section_family: "products",     preferred_section_type: "featured-product-grid-v2",  required: true  },
    { slot: 5,  section_family: "social_proof", preferred_section_type: "editorial-testimonials",    required: true  },
    { slot: 6,  section_family: "trust",        preferred_section_type: "editorial-trust-bar",       required: true  },
    { slot: 7,  section_family: "faq",          preferred_section_type: "faq-v2",                    required: true  },
    { slot: 8,  section_family: "lead_capture", preferred_section_type: "editorial-newsletter",      required: true  },
    { slot: 9,  section_family: "urgency",      preferred_section_type: "editorial-promo-banner",    required: false },
    { slot: 10, section_family: "social_proof", preferred_section_type: "editorial-ugc-strip",       required: false },
  ],
  excluded_section_families: ["navigation"],
};

export const FASHION_PRESET: PresetCatalog = {
  id: "fashion",
  name: "Fashion",
  description: "Premium fashion aesthetic with editorial storytelling, rich imagery, and lifestyle content.",
  focus: ["storytelling", "premium feel", "visual hierarchy"],
  section_count_rules: { min_sections: 6, max_sections: 8 },
  characteristics: {
    typography_style: "elegant",
    color_palette_guidance: "Soft neutrals, editorial black and white, brand accent",
    spacing_scale: "airy",
    animation_intensity: "expressive",
    image_treatment: "editorial, full-bleed, high-contrast",
    cro_emphasis: "Soft — brand desire over conversion pressure",
  },
  copy_intelligence: {
    headline_style: "aspirational editorial with evocative language",
    description_style: "poetic, sensory, lifestyle-oriented",
    cta_style: "subtle discovery: Explore Collection, Discover More, Shop the Edit",
    social_proof_style: "visual user-generated content and styled imagery",
    urgency_style: null,
    emotion_style: "aspirational and luxurious",
  },
  token_refs: {
    colors:     ["primary", "background", "background_secondary", "foreground_heading"],
    typography: ["type_heading_font", "type_accent_font", "type_size_h2"],
    spacing:    ["card_gap", "page_width"],
    radius:     ["global_border_radius"],
    shadows:    ["card_shadow"],
    buttons:    ["button_shape", "primary_button_background", "primary_button_text"],
    animations: ["card_hover_effect", "page_transition_enabled"],
  },
  section_flow: [
    { slot: 1, section_family: "hero",         preferred_section_type: "editorial-hero",          required: true  },
    { slot: 2, section_family: "storytelling", preferred_section_type: "editorial-promo-banner",  required: true  },
    { slot: 3, section_family: "products",     preferred_section_type: "collection-showcase-v2",  required: true  },
    { slot: 4, section_family: "storytelling", preferred_section_type: "brand-story",             required: true  },
    { slot: 5, section_family: "social_proof", preferred_section_type: "editorial-ugc-strip",     required: true  },
    { slot: 6, section_family: "lead_capture", preferred_section_type: "editorial-newsletter",    required: true  },
    { slot: 7, section_family: "social_proof", preferred_section_type: "editorial-testimonials",  required: false },
    { slot: 8, section_family: "content",      preferred_section_type: "editorial-marquee",       required: false },
  ],
  excluded_section_families: ["navigation", "urgency"],
};

export const MINIMAL_MODERN_PRESET: PresetCatalog = {
  id: "minimal-modern",
  name: "Minimal Modern",
  description: "Clean, modern design focused on product clarity, elegant typography, and optimized UX.",
  focus: ["clarity", "modern aesthetics", "performance", "UX"],
  section_count_rules: { min_sections: 5, max_sections: 6 },
  characteristics: {
    typography_style: "clean",
    color_palette_guidance: "Minimal palette — white, near-black, single accent",
    spacing_scale: "airy",
    animation_intensity: "none",
    image_treatment: "clean product photography, minimal backgrounds",
    cro_emphasis: "Moderate — clarity and confidence over pressure",
  },
  copy_intelligence: {
    headline_style: "clean, confident, product-centric",
    description_style: "minimal, feature-focused, scannable",
    cta_style: "clear and confident: Shop, View Collection, Learn More",
    social_proof_style: "clean star ratings and brief testimonials",
    urgency_style: null,
    emotion_style: "calm confidence and sophisticated clarity",
  },
  token_refs: {
    colors:     ["primary", "background", "foreground", "border"],
    typography: ["type_heading_font", "type_body_font", "type_size_h2", "type_size_paragraph"],
    spacing:    ["card_gap", "page_width"],
    radius:     ["global_border_radius", "inputs_border_radius"],
    shadows:    ["card_shadow"],
    buttons:    ["button_shape", "primary_button_background"],
    animations: ["card_hover_effect"],
  },
  section_flow: [
    { slot: 1, section_family: "hero",         preferred_section_type: "editorial-hero",          required: true  },
    { slot: 2, section_family: "products",     preferred_section_type: "featured-product-grid-v2",required: true  },
    { slot: 3, section_family: "content",      preferred_section_type: "benefits",                required: true  },
    { slot: 4, section_family: "faq",          preferred_section_type: "faq-v2",                  required: true  },
    { slot: 5, section_family: "lead_capture", preferred_section_type: "editorial-newsletter",    required: true  },
    { slot: 6, section_family: "social_proof", preferred_section_type: "editorial-testimonials",  required: false },
  ],
  excluded_section_families: ["navigation", "urgency"],
};

export const ALL_PRESETS: PresetCatalog[] = [
  HIGH_CONVERTING_PRESET,
  FASHION_PRESET,
  MINIMAL_MODERN_PRESET,
];

export function getPresetById(id: string): PresetCatalog | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}
