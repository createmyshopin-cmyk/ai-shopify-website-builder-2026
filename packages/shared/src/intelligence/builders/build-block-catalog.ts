import type { BaseThemeTruth } from "./build-base-theme-catalog.js";

// ─── Block Catalog Builder ────────────────────────────────────────────────────
// Catalogs standalone app blocks (from blocks/ directory) and section-defined
// block types. All names are exact Base Theme handles.

export interface BlockCatalogEntry {
  type: string;             // exact block type (from schema or filename)
  parent_sections: string[]; // section handles that define this block type
  settings: Array<{ id: string; type: string }>;
  is_app_block: boolean;   // true if from blocks/ directory
}

export interface BlockCatalog {
  generated_at: string;
  count: number;
  blocks: BlockCatalogEntry[];
}

export function buildBlockCatalog(truth: BaseThemeTruth): BlockCatalog {
  const blockMap: Record<string, BlockCatalogEntry> = {};

  // App blocks from blocks/ directory
  for (const blockFilename of truth.blocks) {
    const type = blockFilename; // exact filename without .liquid already stripped
    if (!blockMap[type]) {
      blockMap[type] = {
        type,
        parent_sections: [],
        settings: [],
        is_app_block: true,
      };
    }
  }

  // Section-defined block types
  for (const section of truth.sections) {
    for (const block of section.blocks) {
      const key = block.type;
      if (!blockMap[key]) {
        blockMap[key] = {
          type: key,
          parent_sections: [],
          settings: block.settings,
          is_app_block: false,
        };
      }
      if (!blockMap[key].parent_sections.includes(section.handle)) {
        blockMap[key].parent_sections.push(section.handle);
      }
      // Merge settings if more complete
      if (block.settings.length > blockMap[key].settings.length) {
        blockMap[key].settings = block.settings;
      }
    }
  }

  const entries = Object.values(blockMap);

  return {
    generated_at: new Date().toISOString(),
    count: entries.length,
    blocks: entries,
  };
}
