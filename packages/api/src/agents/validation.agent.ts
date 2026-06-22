import {
  ValidationOutputSchema,
  runSafetyPipeline,
  type AgentOutputs,
  type AgentPipelineInput,
  type CompilerOutput,
  type LayoutOutput,
  type ValidationOutput,
} from "@theme-editor/shared";

export function runValidationAgent(
  input: AgentPipelineInput,
  layout: LayoutOutput,
  compiler: CompilerOutput,
  extraOutputs: Partial<AgentOutputs> = {},
): ValidationOutput {
  const safety = runSafetyPipeline({
    blueprint: input.blueprint,
    outputs: {
      ...extraOutputs,
      layout,
      compiler,
    },
  });

  return ValidationOutputSchema.parse({
    passed: safety.passed,
    issues: safety.issues,
  });
}
