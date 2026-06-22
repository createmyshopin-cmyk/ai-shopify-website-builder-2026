import type { BaseThemeTruth } from "./build-base-theme-catalog.js";

// ─── Snippet Catalog Builder ───────────────────────────────────────────────────

export interface SnippetCatalogEntry {
  filename: string;         // exact filename without .liquid
  parent_sections: string[]; // section handles that render this snippet
  nested_snippets: string[]; // other snippets this snippet renders (shallow)
}

export interface SnippetCatalog {
  generated_at: string;
  count: number;
  snippets: SnippetCatalogEntry[];
}

export function buildSnippetCatalog(truth: BaseThemeTruth): SnippetCatalog {
  const snippetSet = new Set(truth.snippets);

  // Build parent_sections map: snippet → list of sections that use it
  const parentMap: Record<string, string[]> = {};

  for (const [sectionHandle, usedSnippets] of Object.entries(truth.dependency_graph.section_to_snippets)) {
    for (const snippet of usedSnippets) {
      if (!parentMap[snippet]) parentMap[snippet] = [];
      parentMap[snippet].push(sectionHandle);
    }
  }

  const entries: SnippetCatalogEntry[] = truth.snippets.map((filename) => ({
    filename,
    parent_sections: parentMap[filename] ?? [],
    nested_snippets: [], // Requires deep snippet parsing — populated during full scan
  }));

  return {
    generated_at: new Date().toISOString(),
    count: entries.length,
    snippets: entries,
  };
}
