import { describe, it, expect } from "vitest";

import { AssetIntentEngine } from "./asset-intent.engine.js";
import type { SectionCatalog, PresetCatalog } from "@theme-editor/shared";

const MOCK_HIGH_CONVERTING_PRESET: PresetCatalog = {
  id: "high-converting",
  name: "High Converting",
  description: "Test preset",
  focus: ["conversion"],
  section_count_rules: { min_sections: 8, max_sections: 10 },
  characteristics: {
    typography_style: "bold",
    color_palette_guidance: "High contrast",
    spacing_scale: "compact",
    animation_intensity: "subtle",
    image_treatment: "product-focused",
    cro_emphasis: "Strong",
  },
  copy_intelligence: {
    headline_style: "bold",
    description_style: "benefit-first",
    cta_style: "direct",
    social_proof_style: "specific",
    urgency_style: "scarcity",
    emotion_style: "trustworthy",
  },
  token_refs: {
    colors: ["primary", "background"],
    typography: ["type_heading_font"],
    spacing: ["card_gap"],
    radius: ["global_border_radius"],
    shadows: ["card_shadow"],
    buttons: ["primary_button_background"],
    animations: ["card_hover_effect"],
  },
  section_flow: [
    { slot: 1, section_family: "hero", preferred_section_type: "editorial-hero", required: true },
  ],
  excluded_section_families: ["navigation"],
};

const MOCK_FASHION_PRESET: PresetCatalog = {
  ...MOCK_HIGH_CONVERTING_PRESET,
  id: "fashion",
  characteristics: {
    ...MOCK_HIGH_CONVERTING_PRESET.characteristics,
    image_treatment: "editorial, full-bleed, high-contrast",
  },
};

function mockSectionCatalog(
  handle: string,
  imageSettingIds: string[],
): SectionCatalog {
  return {
    section_id: handle,
    section_type: handle,
    section_path: `sections/${handle}.liquid`,
    section_schema_name: handle,
    section_category: "hero",
    section_role: "hero",
    section_family: "hero",
    section_max_blocks: null,
    section_presets_raw: [],
    section_settings_raw: [
      ...imageSettingIds.map((id) => ({ id, type: "image_picker" })),
      { id: "heading", type: "text" },
    ],
    section_blocks_raw: [],
    priority_score: 90,
    required: true,
    purpose: "Test section",
    metadata: {
      identity: { merchant_goal: "", conversion_goal: "" },
      layout: { desktop_layout: "", tablet_layout: "", mobile_layout: "", alignment_rules: "", content_hierarchy: "" },
      spacing: { section_padding_top: 60, section_padding_bottom: 60, block_spacing: 20, grid_spacing: 20, image_spacing: 16 },
      typography: { heading_font: "", subheading_font: "", body_font: "", heading_size: "", subheading_size: "", body_size: "", font_weight: "", line_height: "", letter_spacing: "" },
      colorSystem: { background_color: "", text_color: "", heading_color: "", secondary_text_color: "", accent_color: "", border_color: "" },
      buttons: { primary_button_color: "", primary_button_text_color: "", secondary_button_color: "" },
      cards: { border_radius: 8, shadow_style: "", elevation: "", hover_effect: "" },
      animation: { reveal_animation: "", hover_animation: "", transition_duration: 300 },
      image: { image_ratio: "", image_shape: "", image_treatment: "" },
      commerce: { product_card_style: "", price_style: "", badge_style: "", discount_style: "", add_to_cart_style: "" },
      trust: { ratings: false, reviews: false, trust_badges: false, guarantees: false },
      seo: { semantic_role: "", heading_hierarchy: "", accessibility_rules: "" },
    },
    compatibility_scores: { high_converting: 90, fashion: 80, minimal_modern: 70 },
    token_refs: { colors: [], typography: [], spacing: [], radius: [], shadows: [], buttons: [], animations: [] },
    flow_rules: { allowed_before: [], allowed_after: [], recommended_before: [], recommended_after: [] },
    runtime_intelligence: { performance_tier: "critical", lcp_risk: "high", cls_risk: "low", lazy_load_strategy: "eager", preload_asset: true, core_web_vitals_target: "lcp" },
  };
}

describe("AssetIntentEngine", () => {
  const engine = new AssetIntentEngine();

  it("generates asset intents for image-bearing sections", () => {
    const sections = [
      mockSectionCatalog("editorial-hero", ["image"]),
      mockSectionCatalog("brand-story",    ["image", "background_image"]),
    ];

    const intents = engine.generateIntents(
      ["editorial-hero", "brand-story"],
      sections,
      MOCK_HIGH_CONVERTING_PRESET,
    );

    expect(intents.length).toBe(3); // 1 + 2 image slots
  });

  it("forge_slot values are real setting IDs from section schema", () => {
    const sections = [mockSectionCatalog("editorial-hero", ["image"])];

    const intents = engine.generateIntents(
      ["editorial-hero"],
      sections,
      MOCK_HIGH_CONVERTING_PRESET,
    );

    expect(intents).toHaveLength(1);
    expect(intents[0]?.forge_slot).toBe("image");       // exact setting ID
    expect(intents[0]?.section_type).toBe("editorial-hero"); // exact Base Theme handle
  });

  it("generates no intents for text-only sections", () => {
    const sections = [mockSectionCatalog("faq-v2", [])]; // no image settings

    const intents = engine.generateIntents(["faq-v2"], sections, MOCK_HIGH_CONVERTING_PRESET);
    expect(intents).toHaveLength(0);
  });

  it("image_mood differs per preset", () => {
    const sections = [mockSectionCatalog("editorial-hero", ["image"])];

    const hcIntents = engine.generateIntents(["editorial-hero"], sections, MOCK_HIGH_CONVERTING_PRESET);
    const fashionIntents = engine.generateIntents(["editorial-hero"], sections, MOCK_FASHION_PRESET);

    expect(hcIntents[0]?.image_mood).not.toBe(fashionIntents[0]?.image_mood);
  });
});
