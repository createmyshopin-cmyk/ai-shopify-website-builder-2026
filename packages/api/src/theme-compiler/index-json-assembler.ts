import type { OrderedSection } from "@theme-editor/shared";

// ─── Index JSON Assembler ─────────────────────────────────────────────────────
// Pure function. Assembles a valid Shopify OS 2.0 index.json structure.

export interface SectionSettingsEntry {
  sectionId: string;
  sectionType: string;
  settings: Record<string, unknown>;
  blocks?: Record<string, { type: string; settings: Record<string, unknown> }>;
}

export interface AssembledIndexJson {
  sections: Record<string, unknown>;
  order: string[];
}

function slugifySectionId(sectionType: string, slot: number): string {
  return `${sectionType.replace(/[^a-z0-9_-]/gi, "_")}_${slot}`;
}

export function assembleIndexJson(
  orderedSections: OrderedSection[],
  settingsMap: Map<string, Record<string, unknown>>,
  blocksMap?: Map<string, Record<string, { type: string; settings: Record<string, unknown> }>>,
): AssembledIndexJson {
  const sections: Record<string, unknown> = {};
  const order: string[] = [];

  for (const section of orderedSections) {
    const sectionId = slugifySectionId(section.section_type, section.final_slot);
    const settings = settingsMap.get(section.section_type) ?? {};
    const blocks = blocksMap?.get(section.section_type);

    const entry: Record<string, unknown> = {
      type: section.section_type,
      settings,
    };

    if (blocks && Object.keys(blocks).length > 0) {
      entry["blocks"] = blocks;
      entry["block_order"] = Object.keys(blocks);
    }

    sections[sectionId] = entry;
    order.push(sectionId);
  }

  return { sections, order };
}
