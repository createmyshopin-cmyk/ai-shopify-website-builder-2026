/**
 * Idempotent keys for Shopify asset uploads (Phase 4.7).
 * Same project + asset always maps to one upload job id.
 */
export function shopifyUploadJobId(
  projectId: string,
  assetKey: string,
): string {
  return `upload-${projectId}-${assetKey}`;
}

export function pipelineStepJobId(
  projectId: string,
  step: string,
): string {
  return `${projectId}-${step}`;
}

export function pipelineFlowJobId(projectId: string): string {
  return `pipeline-${projectId}`;
}
