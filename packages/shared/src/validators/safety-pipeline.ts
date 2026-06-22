import { z } from "zod";

import {
  AgentOutputsSchema,
  CompilerOutputSchema,
  type AgentOutputs,
  type CompilerOutput,
  type ValidationOutput,
} from "../agents/types.js";
import type { ThemeBlueprint } from "../blueprint/types.js";

export const ValidationGateNameSchema = z.enum([
  "json",
  "schema",
  "asset",
  "section",
  "theme",
]);

export type ValidationGateName = z.infer<typeof ValidationGateNameSchema>;

export interface GateResult {
  gate: ValidationGateName;
  passed: boolean;
  issues: ValidationOutput["issues"];
}

export interface SafetyPipelineResult {
  passed: boolean;
  issues: ValidationOutput["issues"];
  gates: GateResult[];
}

export interface SafetyPipelineContext {
  blueprint: ThemeBlueprint;
  outputs: AgentOutputs;
  assetChecks?: AssetCheckInput[];
}

export interface AssetCheckInput {
  url?: string;
  role: string;
  byteSize?: number;
  width?: number;
  height?: number;
}

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_MEGAPIXELS = 20_000_000;

const SHOPIFY_FONT_PATTERN = /^[a-z0-9_]+_n[1-9]$/i;

export function isSupportedShopifyFont(font: string): boolean {
  return SHOPIFY_FONT_PATTERN.test(font) || font.includes("sans-serif");
}

export function validateImageGuardrails(asset: AssetCheckInput): ValidationOutput["issues"] {
  const issues: ValidationOutput["issues"] = [];

  if (asset.byteSize !== undefined && asset.byteSize > MAX_IMAGE_BYTES) {
    issues.push({
      code: "ASSET_TOO_LARGE",
      message: `Asset ${asset.role} exceeds 20MB limit`,
      severity: "error",
    });
  }

  if (
    asset.width !== undefined &&
    asset.height !== undefined &&
    asset.width * asset.height > MAX_MEGAPIXELS
  ) {
    issues.push({
      code: "ASSET_TOO_MANY_PIXELS",
      message: `Asset ${asset.role} exceeds 20MP limit`,
      severity: "error",
    });
  }

  if (!asset.url?.trim()) {
    issues.push({
      code: "MISSING_ASSET_URL",
      message: `Asset ${asset.role} is missing a URL`,
      severity: "error",
    });
  }

  return issues;
}

export function runJsonGate(outputs: AgentOutputs): GateResult {
  const issues: ValidationOutput["issues"] = [];
  const parsed = AgentOutputsSchema.partial().safeParse(outputs);

  if (!parsed.success) {
    issues.push({
      code: "INVALID_AGENT_JSON",
      message: parsed.error.message.slice(0, 200),
      severity: "error",
    });
  }

  if (outputs.compiler) {
    const compilerParsed = CompilerOutputSchema.safeParse(outputs.compiler);
    if (!compilerParsed.success) {
      issues.push({
        code: "INVALID_COMPILER_JSON",
        message: compilerParsed.error.message.slice(0, 200),
        severity: "error",
      });
    }
  }

  return {
    gate: "json",
    passed: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function runSchemaGate(blueprint: ThemeBlueprint): GateResult {
  const issues: ValidationOutput["issues"] = [];

  if (blueprint.sections.length === 0) {
    issues.push({
      code: "EMPTY_BLUEPRINT",
      message: "Blueprint has no sections",
      severity: "error",
    });
  }

  return {
    gate: "schema",
    passed: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function runAssetGate(
  outputs: AgentOutputs,
  assetChecks: AssetCheckInput[] = [],
): GateResult {
  const issues: ValidationOutput["issues"] = [];

  for (const asset of outputs.image?.assets ?? []) {
    issues.push(
      ...validateImageGuardrails({
        role: asset.role,
        url: asset.placeholderUrl,
      }),
    );
  }

  for (const check of assetChecks) {
    issues.push(...validateImageGuardrails(check));
  }

  return {
    gate: "asset",
    passed: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function runSectionGate(
  blueprint: ThemeBlueprint,
  compiler?: CompilerOutput,
): GateResult {
  // The compiler's indexJson.order is the single authoritative section order.
  // Layout agent sectionOrder is a preliminary reference only; it is NOT
  // validated here to prevent dual-path divergence issues.
  const issues: ValidationOutput["issues"] = [];
  const allowed = new Set(blueprint.sections.map((section) => section.type));

  if (compiler) {
    for (const sectionId of compiler.indexJson.order) {
      const section = compiler.indexJson.sections[sectionId] as
        | { type?: string }
        | undefined;

      if (!section?.type) {
        issues.push({
          code: "MISSING_SECTION_TYPE",
          message: `Section ${sectionId} has no type`,
          severity: "error",
        });
        continue;
      }

      if (!allowed.has(section.type)) {
        issues.push({
          code: "COMPILER_UNKNOWN_SECTION",
          message: `Compiler output uses unknown type: ${section.type}`,
          severity: "error",
        });
      }
    }

    if (compiler.indexJson.order.length === 0) {
      issues.push({
        code: "EMPTY_TEMPLATE",
        message: "Compiler produced empty section order",
        severity: "error",
      });
    }
  }

  return {
    gate: "section",
    passed: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

export function runThemeGate(
  blueprint: ThemeBlueprint,
  compiler?: CompilerOutput,
): GateResult {
  const issues: ValidationOutput["issues"] = [];

  // Use the correct Base Theme setting ID: type_heading_font (not type_header_font)
  const headerFont = String(compiler?.settingsPatch?.type_heading_font ?? "");
  if (headerFont && !isSupportedShopifyFont(headerFont)) {
    issues.push({
      code: "UNSUPPORTED_FONT",
      message: `Unsupported font: ${headerFont}`,
      severity: "error",
    });
  }

  for (const font of blueprint.fonts) {
    if (font && !isSupportedShopifyFont(font)) {
      issues.push({
        code: "UNSUPPORTED_BLUEPRINT_FONT",
        message: `Blueprint font not allowed: ${font}`,
        severity: "warning",
      });
    }
  }

  return {
    gate: "theme",
    passed: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

/** PRD safety layer: JSON → Schema → Asset → Section → Theme */
export function runSafetyPipeline(
  context: SafetyPipelineContext,
): SafetyPipelineResult {
  const gates: GateResult[] = [
    runJsonGate(context.outputs),
    runSchemaGate(context.blueprint),
    runAssetGate(context.outputs, context.assetChecks),
    runSectionGate(
      context.blueprint,
      context.outputs.compiler,
    ),
    runThemeGate(context.blueprint, context.outputs.compiler),
  ];

  const issues = gates.flatMap((gate) => gate.issues);
  const passed =
    gates.every((gate) => gate.passed) &&
    !issues.some((issue) => issue.severity === "error");

  return { passed, issues, gates };
}
