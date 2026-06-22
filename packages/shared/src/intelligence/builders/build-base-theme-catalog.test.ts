import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBaseThemeCatalog } from "./build-base-theme-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locate the base theme relative to the repo root
async function findBaseThemePath(): Promise<string> {
  // Walk up from the test file to find repo root
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "base theme");
    try {
      const { stat } = await import("node:fs/promises");
      await stat(candidate);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error("Base theme not found");
}

describe("buildBaseThemeCatalog", () => {
  it("scans exactly 172 sections from Horizon Pro", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    // Horizon Pro 2.7.0 has 172 sections
    expect(truth.sections.length).toBe(172);
  });

  it("preserves exact section handles — no invented names", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    const handles = truth.sections.map((s) => s.handle);

    // Core sections must exist with exact handles
    expect(handles).toContain("editorial-hero");
    expect(handles).toContain("faq-v2");
    expect(handles).toContain("editorial-newsletter");
    expect(handles).toContain("editorial-trust-bar");
    expect(handles).toContain("editorial-testimonials");
    expect(handles).toContain("benefits");
    expect(handles).toContain("featured-product-grid-v2");
    expect(handles).toContain("editorial-collection-grid");
    expect(handles).toContain("editorial-promo-banner");
    expect(handles).toContain("brand-story");
    expect(handles).toContain("collection-showcase-v2");
    expect(handles).toContain("editorial-ugc-strip");
  });

  it("does NOT contain phantom section handles", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    const handles = truth.sections.map((s) => s.handle);

    // These were invented names — must NOT exist
    expect(handles).not.toContain("promo-banner");
    expect(handles).not.toContain("editorial-banner");
    expect(handles).not.toContain("feature-grid");
  });

  it("editorial-hero has max_blocks: 8", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    const hero = truth.sections.find((s) => s.handle === "editorial-hero");
    expect(hero).toBeDefined();
    expect(hero?.max_blocks).toBe(8);
  });

  it("color_schemes contains scheme-1 with primary token", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    expect(truth.color_schemes["scheme-1"]).toBeDefined();
    expect(truth.color_schemes["scheme-1"]?.settings["primary"]).toBeDefined();
  });

  it("primary color token resolves to #2d1b4e", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    const primary = truth.color_schemes["scheme-1"]?.settings["primary"];
    expect(primary).toBe("#2d1b4e");
  });

  it("catalogs at least 100 snippets", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    expect(truth.snippets.length).toBeGreaterThanOrEqual(100);
  });

  it("catalogs templates including index.json", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    const keys = truth.templates.map((t) => t.key);
    expect(keys).toContain("index");
  });

  it("meta.themeName is Horizon Pro", async () => {
    const baseThemePath = await findBaseThemePath();
    const truth = await buildBaseThemeCatalog(baseThemePath);

    expect(truth.meta.themeName).toBe("Horizon Pro");
  });
});
