import {
  LayoutOutputSchema,
  PresetFlowEngine,
  type AgentPipelineInput,
  type LayoutOutput,
  type VisionOutput,
} from "@theme-editor/shared";

// ── Layout Agent ──────────────────────────────────────────────────────────────
// Fully deterministic — no LLM involvement.
// Section ORDER is the sole responsibility of PresetFlowEngine (catalog-backed)
// + ThemeCompilerService (SectionSelectionService + OrderingEngine) in the
// COMPILER step.  The layout agent produces only a preliminary reference order
// and spacing metadata; the compiler's indexJson.order is authoritative.
const presetFlowEngine = new PresetFlowEngine();

const SPACING_SCALE_BY_PRESET: Record<string, "compact" | "balanced" | "airy"> = {
  "high-converting": "compact",
  "fashion": "airy",
  "minimal-modern": "airy",
};

export async function runLayoutAgent(
  input: AgentPipelineInput,
  _vision: VisionOutput,
): Promise<LayoutOutput> {
  const blueprintTypes = new Set(input.blueprint.sections.map((s) => s.type));

  // Deterministic section ordering — never involves the LLM.
  let sectionOrder: string[];
  try {
    sectionOrder = presetFlowEngine
      .getSectionOrder(input.stylePreset)
      .filter((type) => blueprintTypes.has(type));

    if (sectionOrder.length === 0) {
      sectionOrder = presetFlowEngine
        .getFullSectionOrder(input.stylePreset)
        .filter((type) => blueprintTypes.has(type));
    }
  } catch {
    // Unknown preset: fall back to blueprint template order
    sectionOrder = (
      input.blueprint.templateSectionOrder?.filter((t) => blueprintTypes.has(t)) ??
      [...blueprintTypes]
    ).slice(0, 6);
  }

  const spacingScale = SPACING_SCALE_BY_PRESET[input.stylePreset] ?? "balanced";
  const heroSectionType = sectionOrder[0] ?? "editorial-hero";

  return LayoutOutputSchema.parse({
    sectionOrder,
    spacingScale,
    hierarchyNotes: `Deterministic layout: ${input.stylePreset} preset — ${sectionOrder.length} sections`,
    heroSectionType,
  });
}
