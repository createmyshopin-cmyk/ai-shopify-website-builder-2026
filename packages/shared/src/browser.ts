/**
 * Browser-safe exports for the Shopify embedded app (no Node.js fs/path).
 */
export {
  STYLE_PRESETS,
  type AiStylePresetKey,
  type StylePresetId,
  getAiKeyForPreset,
  getPresetLabel,
  isStylePresetId,
} from "./presets.js";

export {
  InitiateProjectRequestSchema,
  InitiateProjectResponseSchema,
  ProjectStatusResponseSchema,
  ProjectListItemSchema,
  ProjectListResponseSchema,
  ProjectPreviewMetadataSchema,
  ProjectPreviewResponseSchema,
  type InitiateProjectRequest,
  type InitiateProjectResponse,
  type ProjectStatusResponse,
  type ProjectEventsResponse,
  type ProjectListItem,
  type ProjectListResponse,
  type ProjectPreviewMetadata,
  type ProjectPreviewResponse,
  ProjectEventsResponseSchema,
} from "./contracts/projects.js";

export {
  RunPipelineRequestSchema,
  RunPipelineResponseSchema,
  type RunPipelineRequest,
  type RunPipelineResponse,
  VisionOutputSchema,
  CopyOutputSchema,
  ImageOutputSchema,
  LayoutOutputSchema,
  CompilerOutputSchema,
  ValidationOutputSchema,
  AgentOutputsSchema,
  type VisionOutput,
  type CopyOutput,
  type ImageOutput,
  type LayoutOutput,
  type CompilerOutput,
  type ValidationOutput,
  type AgentOutputs,
  type AgentPipelineInput,
  UploadManifestSchema,
  type UploadManifest,
} from "./agents/types.js";

export { GOLDEN_AGENT_OUTPUTS } from "./agents/fixtures.js";

export const JOB_TYPES = [
  "VISION",
  "COPY",
  "IMAGE",
  "LAYOUT",
  "COMPILER",
  "UPLOAD",
  "VALIDATION",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export {
  ThemeBlueprintSchema,
  type ThemeBlueprint,
} from "./blueprint/types.js";

export { withRetry, PRD_RETRY_DELAYS_MS } from "./utils/retry.js";

export {
  QUEUE_NAMES,
  PIPELINE_QUEUE,
  PIPELINE_JOB_ORDER,
  PRD_PROGRESS_MESSAGES,
  progressMessageForStep,
  type PipelineJobData,
} from "./queue/constants.js";

export {
  ProjectProgressEventSchema,
  EnqueuePipelineResponseSchema,
  type ProjectProgressEvent,
  type EnqueuePipelineResponse,
} from "./queue/progress.js";

export {
  shopifyUploadJobId,
  pipelineStepJobId,
  pipelineFlowJobId,
} from "./queue/idempotency.js";

export {
  PreviewPatchRequestSchema,
  PreviewPatchResponseSchema,
  PreviewPatchSchema,
  PreviewSectionSchema,
  PreviewStateResponseSchema,
  PreviewStateSchema,
  PRD_SECTION_PICKER_TYPES,
  type PreviewPatch,
  type PreviewPatchRequest,
  type PreviewPatchResponse,
  type PreviewSection,
  type PreviewState,
  type PreviewStateResponse,
} from "./preview/types.js";

export {
  buildAdminThemeEditorUrl,
  buildStorefrontPreviewUrl,
  normalizeShopDomain,
  parseThemeNumericId,
} from "./shopify/preview-url.js";

export {
  ChatMessageSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
} from "./chat/types.js";

export {
  ApplyProjectRequestSchema,
  ApplyProjectResponseSchema,
  RollbackRequestSchema,
  RollbackResponseSchema,
  VersionListResponseSchema,
  type ApplyProjectRequest,
  type ApplyProjectResponse,
  type RollbackRequest,
  type RollbackResponse,
  type VersionListResponse,
} from "./apply/types.js";
