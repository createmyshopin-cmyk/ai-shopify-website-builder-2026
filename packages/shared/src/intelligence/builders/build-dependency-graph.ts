import type { BaseThemeTruth } from "./build-base-theme-catalog.js";

// ─── Dependency Graph Builder ──────────────────────────────────────────────────
// Full relationship map derived from BaseThemeTruth.
// All identifiers are exact Base Theme handles.

export interface DependencyGraphOutput {
  generated_at: string;
  section_to_blocks: Record<string, string[]>;
  section_to_snippets: Record<string, string[]>;
  template_to_sections: Record<string, string[]>;
  snippet_to_sections: Record<string, string[]>; // inverse: which sections render this snippet
  block_type_to_sections: Record<string, string[]>; // inverse: which sections define this block
  summary: {
    total_sections: number;
    total_snippets: number;
    total_block_types: number;
    total_templates: number;
    sections_with_blocks: number;
    sections_with_snippets: number;
  };
}

export function buildDependencyGraph(truth: BaseThemeTruth): DependencyGraphOutput {
  const { dependency_graph, sections } = truth;

  // Snippet → sections (inverse of section_to_snippets)
  const snippetToSections: Record<string, string[]> = {};
  for (const [sectionHandle, snippets] of Object.entries(dependency_graph.section_to_snippets)) {
    for (const snippet of snippets) {
      if (!snippetToSections[snippet]) snippetToSections[snippet] = [];
      snippetToSections[snippet].push(sectionHandle);
    }
  }

  // Block type → sections (inverse of section_to_blocks)
  const blockTypeToSections: Record<string, string[]> = {};
  for (const section of sections) {
    for (const block of section.blocks) {
      if (!blockTypeToSections[block.type]) blockTypeToSections[block.type] = [];
      blockTypeToSections[block.type].push(section.handle);
    }
  }

  const allBlockTypes = new Set(sections.flatMap((s) => s.blocks.map((b) => b.type)));

  return {
    generated_at: new Date().toISOString(),
    section_to_blocks:    dependency_graph.section_to_blocks,
    section_to_snippets:  dependency_graph.section_to_snippets,
    template_to_sections: dependency_graph.template_to_sections,
    snippet_to_sections:  snippetToSections,
    block_type_to_sections: blockTypeToSections,
    summary: {
      total_sections:          sections.length,
      total_snippets:          truth.snippets.length,
      total_block_types:       allBlockTypes.size,
      total_templates:         truth.templates.length,
      sections_with_blocks:    sections.filter((s) => s.blocks.length > 0).length,
      sections_with_snippets:  Object.keys(dependency_graph.section_to_snippets).length,
    },
  };
}
