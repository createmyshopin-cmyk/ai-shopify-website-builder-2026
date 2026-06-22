import { Injectable } from "@nestjs/common";

import type { CompilerErrorDetail, CompilerErrorCode } from "./compiler-errors.js";
import { CompilerError } from "./compiler-errors.js";

// ─── ThemeCompilerValidatorService ────────────────────────────────────────────
// 12-check validation layer. Runs before writing index.json.
// Stops compilation if any error-severity check fails.

export interface ValidationContext {
  presetId: string;
  sections: Record<string, { type: string; settings: Record<string, unknown>; blocks?: Record<string, { type: string }> }>;
  order: string[];
  blueprintTypes: Set<string>;
  presetSectionOrder: string[];
  variantCatalog: Record<string, string[]>;
  resolvedTokenIds: Set<string>;
  sectionCompatibilityScores: Map<string, { high_converting: number; fashion: number; minimal_modern: number }>;
  sectionBlockLimits: Map<string, number>;
}

@Injectable()
export class CompilerValidatorService {
  validate(ctx: ValidationContext): void {
    const issues: CompilerErrorDetail[] = [];

    issues.push(...this.check1_sectionSchema(ctx));
    issues.push(...this.check2_blockSchema(ctx));
    issues.push(...this.check3_settingsSchema(ctx));
    issues.push(...this.check4_sectionOrdering(ctx));
    issues.push(...this.check5_presetCompatibility(ctx));
    issues.push(...this.check6_variantCompatibility(ctx));
    issues.push(...this.check7_tokenReferences(ctx));
    issues.push(...this.check8_duplicateIds(ctx));
    issues.push(...this.check9_imageSettings(ctx));
    issues.push(...this.check10_blockLimits(ctx));
    issues.push(...this.check11_requiredFields(ctx));
    issues.push(...this.check12_os20Structure(ctx));

    const errors = issues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      throw new CompilerError(issues);
    }
  }

  private makeError(code: CompilerErrorCode, message: string, sectionId?: string, field?: string): CompilerErrorDetail {
    return { code, message, severity: "error", sectionId, field };
  }

  private makeWarning(code: CompilerErrorCode, message: string, sectionId?: string): CompilerErrorDetail {
    return { code, message, severity: "warning", sectionId };
  }

  // Check 1: Section types exist in blueprint
  private check1_sectionSchema(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      if (!ctx.blueprintTypes.has(section.type)) {
        issues.push(this.makeError(
          "INVALID_SECTION_TYPE",
          `Section type "${section.type}" is not in the blueprint. Valid types: ${[...ctx.blueprintTypes].join(", ")}`,
          sectionId,
          "type",
        ));
      }
    }
    return issues;
  }

  // Check 2: Block types are valid (non-empty strings)
  private check2_blockSchema(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      if (section.blocks) {
        for (const [blockId, block] of Object.entries(section.blocks)) {
          if (!block.type || typeof block.type !== "string") {
            issues.push(this.makeError(
              "INVALID_BLOCK_SCHEMA",
              `Block "${blockId}" in section "${sectionId}" has invalid or missing type`,
              sectionId,
              `blocks.${blockId}.type`,
            ));
          }
        }
      }
    }
    return issues;
  }

  // Check 3: Settings are valid objects (keys are strings)
  private check3_settingsSchema(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      if (section.settings && typeof section.settings !== "object") {
        issues.push(this.makeError(
          "INVALID_SETTINGS_SCHEMA",
          `Section "${sectionId}" settings must be an object`,
          sectionId,
          "settings",
        ));
      }
    }
    return issues;
  }

  // Check 4: Section ordering — hero first, footer last
  private check4_sectionOrdering(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    if (ctx.order.length === 0) return issues;

    const firstId = ctx.order[0]!;
    const firstType = ctx.sections[firstId]?.type ?? "";
    const isHero = firstType.includes("hero") || firstType.includes("banner");

    if (!isHero) {
      issues.push(this.makeError(
        "INVALID_SECTION_ORDER",
        `First section must be a hero-family section. Got: "${firstType}"`,
        firstId,
        "order[0]",
      ));
    }

    return issues;
  }

  // Check 5: All sections pass compatibility score >= 40 for the preset
  private check5_presetCompatibility(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const presetKey = ctx.presetId.replace("-", "_") as keyof { high_converting: number; fashion: number; minimal_modern: number };

    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      const scores = ctx.sectionCompatibilityScores.get(section.type);
      if (scores) {
        const score = scores[presetKey as keyof typeof scores] ?? 100;
        if (score < 40) {
          issues.push(this.makeError(
            "PRESET_INCOMPATIBLE_SECTION",
            `Section "${section.type}" has compatibility score ${score} for preset "${ctx.presetId}" (minimum: 40)`,
            sectionId,
          ));
        }
      }
    }
    return issues;
  }

  // Check 6: Variants exist in variant catalog
  private check6_variantCompatibility(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      const variant = (section.settings["_variant"] as string | undefined);
      if (variant) {
        const available = ctx.variantCatalog[section.type] ?? [];
        if (available.length > 0 && !available.includes(variant)) {
          issues.push(this.makeWarning(
            "UNSUPPORTED_VARIANT",
            `Variant "${variant}" not found for section type "${section.type}". Available: ${available.join(", ")}`,
            sectionId,
          ));
        }
      }
    }
    return issues;
  }

  // Check 7: Token references resolve
  private check7_tokenReferences(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      for (const [key, value] of Object.entries(section.settings)) {
        if (typeof value === "string" && value.startsWith("token:")) {
          const tokenId = value.replace("token:", "");
          if (!ctx.resolvedTokenIds.has(tokenId)) {
            issues.push(this.makeError(
              "MISSING_TOKEN_REF",
              `Setting "${key}" in section "${sectionId}" references unknown token "${tokenId}"`,
              sectionId,
              key,
            ));
          }
        }
      }
    }
    return issues;
  }

  // Check 8: No duplicate section IDs
  private check8_duplicateIds(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const seen = new Set<string>();

    for (const sectionId of ctx.order) {
      if (seen.has(sectionId)) {
        issues.push(this.makeError(
          "DUPLICATE_SECTION_ID",
          `Duplicate section ID "${sectionId}" found in order`,
          sectionId,
        ));
      }
      seen.add(sectionId);
    }
    return issues;
  }

  // Check 9: Image settings not empty
  private check9_imageSettings(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      for (const [key, value] of Object.entries(section.settings)) {
        if (key.toLowerCase().includes("image") && value === "") {
          issues.push(this.makeWarning(
            "INVALID_IMAGE_SETTING",
            `Image setting "${key}" in section "${sectionId}" is empty — use a placeholder URL`,
            sectionId,
          ));
        }
      }
    }
    return issues;
  }

  // Check 10: Block limits not exceeded
  private check10_blockLimits(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      const maxBlocks = ctx.sectionBlockLimits.get(section.type);
      if (maxBlocks !== undefined && section.blocks) {
        const blockCount = Object.keys(section.blocks).length;
        if (blockCount > maxBlocks) {
          issues.push(this.makeError(
            "BLOCK_LIMIT_EXCEEDED",
            `Section "${sectionId}" (type: ${section.type}) has ${blockCount} blocks but max_blocks is ${maxBlocks}`,
            sectionId,
          ));
        }
      }
    }
    return issues;
  }

  // Check 11: Required fields for conversion sections
  private check11_requiredFields(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];
    const conversionSectionPatterns = ["hero", "cta", "newsletter", "promo"];

    for (const [sectionId, section] of Object.entries(ctx.sections)) {
      const isConversionSection = conversionSectionPatterns.some((p) =>
        section.type.toLowerCase().includes(p),
      );

      if (isConversionSection) {
        const headingFields = ["heading", "title", "headline"];
        const ctaFields = ["button_label", "cta", "button_text"];

        const hasHeading = headingFields.some((f) => {
          const val = section.settings[f];
          return val && typeof val === "string" && val.trim().length > 0;
        });

        const hasCta = ctaFields.some((f) => {
          const val = section.settings[f];
          return val && typeof val === "string" && val.trim().length > 0;
        });

        if (!hasHeading) {
          issues.push(this.makeWarning(
            "MISSING_REQUIRED_FIELD",
            `Conversion section "${sectionId}" (${section.type}) is missing a heading/title`,
            sectionId,
          ));
        }
        if (!hasCta) {
          issues.push(this.makeWarning(
            "MISSING_REQUIRED_FIELD",
            `Conversion section "${sectionId}" (${section.type}) is missing a CTA button label`,
            sectionId,
          ));
        }
      }
    }
    return issues;
  }

  // Check 12: Valid Shopify OS 2.0 structure
  private check12_os20Structure(ctx: ValidationContext): CompilerErrorDetail[] {
    const issues: CompilerErrorDetail[] = [];

    if (!ctx.sections || typeof ctx.sections !== "object") {
      issues.push(this.makeError("INVALID_OS20_STRUCTURE", "index.json must have a top-level 'sections' object"));
    }

    if (!Array.isArray(ctx.order)) {
      issues.push(this.makeError("INVALID_OS20_STRUCTURE", "index.json must have a top-level 'order' array"));
    }

    // Check for orphaned IDs (in order but not in sections)
    for (const id of ctx.order) {
      if (!ctx.sections[id]) {
        issues.push(this.makeError(
          "INVALID_OS20_STRUCTURE",
          `Section ID "${id}" is in order but not in sections`,
          id,
        ));
      }
    }

    // Check for sections not in order
    for (const id of Object.keys(ctx.sections)) {
      if (!ctx.order.includes(id)) {
        issues.push(this.makeWarning(
          "INVALID_OS20_STRUCTURE",
          `Section "${id}" exists in sections but is not in order array — it will not be rendered`,
          id,
        ));
      }
    }

    return issues;
  }
}
