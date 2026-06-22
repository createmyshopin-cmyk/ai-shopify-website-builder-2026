/**
 * Canonical style presets — shared by UI, API, and AI agents.
 */
export const STYLE_PRESETS = [
  {
    id: "high-converting",
    label: "High Converting",
    aiKey: "high-converting",
    description:
      "Bold CTAs, trust signals, and urgency-driven layouts built to maximize sales.",
    colors: ["#1a1a2e", "#e94560", "#f5f5f5"] as const,
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)",
  },
  {
    id: "fashion",
    label: "Fashion",
    aiKey: "fashion",
    description:
      "Editorial imagery, elegant typography, and spacious layouts for lifestyle brands.",
    colors: ["#2c2c2c", "#c9a96e", "#faf8f5"] as const,
    gradient: "linear-gradient(135deg, #2c2c2c 0%, #c9a96e 100%)",
  },
  {
    id: "minimal-modern",
    label: "Minimal Modern",
    aiKey: "minimal",
    description:
      "Clean lines, generous whitespace, and restrained palettes for a premium feel.",
    colors: ["#111827", "#6b7280", "#f9fafb"] as const,
    gradient: "linear-gradient(135deg, #111827 0%, #6b7280 100%)",
  },
] as const;

export type StylePresetId = (typeof STYLE_PRESETS)[number]["id"];

export type AiStylePresetKey =
  (typeof STYLE_PRESETS)[number]["aiKey"];

const PRESET_ID_SET = new Set<string>(STYLE_PRESETS.map((p) => p.id));

export function isStylePresetId(value: string): value is StylePresetId {
  return PRESET_ID_SET.has(value);
}

export function getAiKeyForPreset(
  presetId: StylePresetId,
): AiStylePresetKey {
  const preset = STYLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`Unknown style preset: ${presetId}`);
  }
  return preset.aiKey;
}

export function getPresetLabel(presetId: StylePresetId): string {
  const preset = STYLE_PRESETS.find((p) => p.id === presetId);
  return preset?.label ?? presetId;
}
