import { Injectable } from "@nestjs/common";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ThemeKnowledgeEngine } from "@theme-editor/shared";

// ─── CatalogLoaderService ─────────────────────────────────────────────────────
// NestJS injectable wrapper around ThemeKnowledgeEngine.
// Handles path resolution relative to the package root.

function resolveCatalogsDir(): string {
  // Try environment variable first (configurable for different environments)
  if (process.env["INTELLIGENCE_CATALOGS_DIR"]) {
    return process.env["INTELLIGENCE_CATALOGS_DIR"];
  }

  // Default: resolve relative to package root
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, "../../../shared/src/intelligence/catalogs");
}

@Injectable()
export class CatalogLoaderService {
  private readonly engine: ThemeKnowledgeEngine;

  constructor() {
    this.engine = new ThemeKnowledgeEngine(resolveCatalogsDir());
  }

  get knowledgeEngine(): ThemeKnowledgeEngine {
    return this.engine;
  }
}
