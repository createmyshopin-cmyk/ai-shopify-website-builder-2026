import {
  type AgentPipelineInput,
  type CompilerOutput,
  type CopyOutput,
  type ImageOutput,
  type LayoutOutput,
  type VisionOutput,
} from "@theme-editor/shared";

import type { ThemeCompilerService } from "../theme-compiler/theme-compiler.service.js";
import { CompilerError, MissingSectionCatalogError } from "../theme-compiler/compiler-errors.js";

// ─── runCompilerAgent ─────────────────────────────────────────────────────────
// Routes compilation through ThemeCompilerService (intelligence engine).
//
// STOP POLICY:
//   • CompilerError (validation, phantom handles, invented tokens) → re-throw immediately.
//     The pipeline STOPS. No fallback.
//   • MissingSectionCatalogError (catalog not generated / stale) → re-throw.
//     Run 'npm run generate:intelligence' to fix.
//   • ThemeCompilerService not injected → legacy compiler is used ONLY in this case,
//     which signals a misconfigured deployment, not a compilation failure.
//
// The legacy compiler (compileThemeAsAgentOutput) is intentionally removed from
// the failure path. Silently falling back bypasses BaseThemeTruth, all validators,
// and token checks — this is forbidden in production.

export async function runCompilerAgent(
  input: AgentPipelineInput,
  vision: VisionOutput,
  copy: CopyOutput,
  layout: LayoutOutput,
  images: ImageOutput,
  themeCompilerService?: ThemeCompilerService,
): Promise<CompilerOutput> {
  if (!themeCompilerService) {
    // ThemeCompilerService was not injected — this is a deployment configuration
    // issue. Throw rather than silently produce an unvalidated output.
    throw new Error(
      "[compiler.agent] ThemeCompilerService is not available. " +
      "Ensure ThemeCompilerModule is imported and ThemeCompilerService is injected into PipelineRunner. " +
      "The legacy compiler has been removed — all compilation must go through the intelligence engine.",
    );
  }

  // All failures from ThemeCompilerService propagate directly.
  // CompilerError and MissingSectionCatalogError are validation/logic failures
  // that must stop the pipeline. Infrastructure failures (Redis, DB) also
  // propagate — PipelineRunner handles retry and status recording.
  return await themeCompilerService.compile({
    projectId: input.projectId,
    shop: input.shop,
    productIds: input.productIds,
    stylePreset: input.stylePreset,
    blueprint: input.blueprint,
    vision,
    copy,
    layout,
    image: images,
    products: input.products,
  });
}

// Re-export error types so PipelineRunner can distinguish validation failures
// from infrastructure failures when logging.
export { CompilerError, MissingSectionCatalogError };
