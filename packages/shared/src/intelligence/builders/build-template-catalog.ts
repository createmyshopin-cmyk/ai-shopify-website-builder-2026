import type { BaseThemeTruth, BaseThemeTemplate } from "./build-base-theme-catalog.js";

// ─── Template Catalog Builder ─────────────────────────────────────────────────
// Catalogs all Shopify templates with their section type maps.
// Filenames and section types are exact Base Theme handles.

export interface TemplateCatalogEntry {
  filename: string;           // e.g. "index.json"
  key: string;                // e.g. "index"
  layout: string;             // "theme" or custom
  sections: string[];         // section handles used in this template
  is_alternate: boolean;      // true if filename contains "." (e.g. "page.about.json")
}

export interface TemplateCatalog {
  generated_at: string;
  count: number;
  templates: TemplateCatalogEntry[];
}

function isAlternateTemplate(filename: string): boolean {
  const key = filename.replace(/\.json$/, "");
  return key.split(".").length > 1;
}

export function buildTemplateCatalog(truth: BaseThemeTruth): TemplateCatalog {
  const entries: TemplateCatalogEntry[] = truth.templates.map((template: BaseThemeTemplate) => ({
    filename: template.filename,
    key: template.key,
    layout: template.layout,
    sections: template.sections,
    is_alternate: isAlternateTemplate(template.filename),
  }));

  return {
    generated_at: new Date().toISOString(),
    count: entries.length,
    templates: entries,
  };
}
