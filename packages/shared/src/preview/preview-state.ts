import type { AgentOutputs, CompilerOutput } from "../agents/types.js";
import type { ThemeBlueprint } from "../blueprint/types.js";
import {
  PRD_SECTION_PICKER_TYPES,
  PreviewPatchSchema,
  PreviewStateSchema,
  type PreviewPatch,
  type PreviewSection,
  type PreviewState,
} from "./types.js";

export function getAvailableSectionTypes(blueprint: ThemeBlueprint): string[] {
  const allowed = new Set(blueprint.sections.map((section) => section.type));
  const curated = PRD_SECTION_PICKER_TYPES.filter((type) => allowed.has(type));
  if (curated.length > 0) {
    return curated;
  }
  return blueprint.sections.slice(0, 25).map((section) => section.type);
}

export function buildPreviewStateFromOutputs(
  projectId: string,
  blueprint: ThemeBlueprint,
  outputs: AgentOutputs,
  disabledSectionIds: string[] = [],
): PreviewState {
  const compiler = outputs.compiler;
  if (!compiler) {
    throw new Error("Compiler output required for preview state");
  }

  const disabled = new Set(
    disabledSectionIds.length > 0
      ? disabledSectionIds
      : (outputs.previewEditor?.disabledSectionIds ?? []),
  );

  const order =
    outputs.previewEditor?.sectionOrder &&
    outputs.previewEditor.sectionOrder.length > 0
      ? outputs.previewEditor.sectionOrder
      : [...compiler.indexJson.order, ...disabledSectionIds.filter(
          (id) => !compiler.indexJson.order.includes(id),
        )];

  const sectionIds = [
    ...new Set([
      ...order,
      ...Object.keys(compiler.indexJson.sections),
      ...disabledSectionIds,
    ]),
  ];

  const sections: PreviewSection[] = sectionIds.map((id) => {
    const block = compiler.indexJson.sections[id] as {
      type?: string;
      settings?: Record<string, unknown>;
    };

    const existing = order.find((entry) => entry === id);
    if (!existing && !block) {
      return null;
    }

    return {
      id,
      type: block?.type ?? "section",
      enabled: !disabled.has(id),
      settings: block?.settings ?? {},
    };
  }).filter((section): section is PreviewSection => section !== null);

  const normalizedOrder = order.filter((id) =>
    sections.some((section) => section.id === id),
  );

  return PreviewStateSchema.parse({
    projectId,
    order: normalizedOrder,
    sections,
    settingsPatch: compiler.settingsPatch ?? {},
    cssVariables: compiler.cssVariables ?? {},
    availableSectionTypes: getAvailableSectionTypes(blueprint),
  });
}

export function previewStateToCompilerOutput(state: PreviewState): CompilerOutput {
  const enabledOrder = state.order.filter((id) => {
    const section = state.sections.find((entry) => entry.id === id);
    return section?.enabled !== false;
  });

  const sections: Record<string, unknown> = {};
  for (const id of enabledOrder) {
    const section = state.sections.find((entry) => entry.id === id);
    if (!section) {
      continue;
    }
    sections[id] = {
      type: section.type,
      settings: section.settings,
    };
  }

  return {
    indexJson: { sections, order: enabledOrder },
    settingsPatch: state.settingsPatch,
    cssVariables: state.cssVariables,
  };
}

function assertSectionTypesAllowed(
  blueprint: ThemeBlueprint,
  sectionTypes: string[],
): void {
  const allowed = new Set(blueprint.sections.map((section) => section.type));
  for (const sectionType of sectionTypes) {
    if (!allowed.has(sectionType)) {
      throw new Error(`Section type not in blueprint: ${sectionType}`);
    }
  }
}

export function applyPreviewPatch(
  state: PreviewState,
  patch: PreviewPatch,
  blueprint: ThemeBlueprint,
): PreviewState {
  const parsed = PreviewPatchSchema.parse(patch);
  const next: PreviewState = {
    ...state,
    sections: state.sections.map((section) => ({ ...section, settings: { ...section.settings } })),
    order: [...state.order],
    settingsPatch: { ...state.settingsPatch },
    cssVariables: { ...state.cssVariables },
  };

  switch (parsed.op) {
    case "reorder": {
      const ids = new Set(next.sections.map((section) => section.id));
      for (const id of parsed.order) {
        if (!ids.has(id)) {
          throw new Error(`Unknown section id in reorder: ${id}`);
        }
      }
      if (parsed.order.length !== next.order.length) {
        throw new Error("Reorder must include every section id");
      }
      next.order = parsed.order;
      break;
    }
    case "updateSection": {
      const section = next.sections.find((entry) => entry.id === parsed.sectionId);
      if (!section) {
        throw new Error(`Section not found: ${parsed.sectionId}`);
      }
      section.settings = { ...section.settings, ...parsed.settings };
      break;
    }
    case "toggleSection": {
      const section = next.sections.find((entry) => entry.id === parsed.sectionId);
      if (!section) {
        throw new Error(`Section not found: ${parsed.sectionId}`);
      }
      section.enabled = parsed.enabled;
      break;
    }
    case "addSection": {
      assertSectionTypesAllowed(blueprint, [parsed.sectionType]);
      const newId = `${parsed.sectionType.replace(/[^a-z0-9_-]/gi, "_")}_${Date.now()}`;
      const newSection: PreviewSection = {
        id: newId,
        type: parsed.sectionType,
        enabled: true,
        settings: {
          heading: String(next.settingsPatch.color_primary ?? ""),
        },
      };
      next.sections.push(newSection);
      if (parsed.afterSectionId) {
        const index = next.order.indexOf(parsed.afterSectionId);
        if (index === -1) {
          next.order.push(newId);
        } else {
          next.order.splice(index + 1, 0, newId);
        }
      } else {
        next.order.push(newId);
      }
      break;
    }
    case "updateTheme": {
      if (parsed.settingsPatch) {
        next.settingsPatch = { ...next.settingsPatch, ...parsed.settingsPatch };
        if (parsed.settingsPatch.color_primary) {
          next.cssVariables = {
            ...next.cssVariables,
            "--color-primary": String(parsed.settingsPatch.color_primary),
          };
        }
      }
      if (parsed.cssVariables) {
        next.cssVariables = { ...next.cssVariables, ...parsed.cssVariables };
      }
      break;
    }
    case "restore":
      return PreviewStateSchema.parse(parsed.snapshot);
    default:
      break;
  }

  return PreviewStateSchema.parse(next);
}

export function layoutSectionOrderFromState(state: PreviewState): string[] {
  return state.order
    .map((id) => state.sections.find((section) => section.id === id))
    .filter((section): section is PreviewSection => Boolean(section))
    .filter((section) => section.enabled)
    .map((section) => section.type);
}

export function disabledSectionIdsFromState(state: PreviewState): string[] {
  return state.sections.filter((section) => !section.enabled).map((section) => section.id);
}
