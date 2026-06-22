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

export {
  ThemeBlueprintManifestSchema,
  DEFAULT_LLM_MAP_PATH,
  type ThemeBlueprintManifest,
} from "./blueprint/manifest-types.js";

export {
  buildBlueprintManifestFromBlueprint,
  buildBlueprintManifestFromThemeFiles,
  buildBlueprintManifestFromPath,
} from "./blueprint/build-manifest.js";

export {
  loadBlueprintManifest,
  loadBlueprintFromManifest,
  tryLoadBlueprintFromManifest,
  resolveThemeBlueprintManifestPath,
} from "./blueprint/load-manifest.js";

export {
  buildBlueprintFromLocalTheme,
  resolveBaseThemePath,
  readLocalTheme,
  findRepoRoot,
} from "./blueprint/local-theme-reader.js";

export { buildBlueprintFromThemeFiles } from "./blueprint/build-blueprint.js";

export {
  ThemeLlmMapSchema,
  LlmPromptContextSchema,
  type ThemeLlmMap,
  type LlmPromptContext,
  type LlmSection,
  type DesignTokens,
  type LandingPageRecipe,
} from "./blueprint/llm-map/types.js";

export {
  buildLlmThemeMap,
  buildLlmThemeMapFromPath,
} from "./blueprint/llm-map/build-llm-map.js";

export {
  loadLlmThemeMap,
  resolveThemeLlmMapPath,
  getLlmPromptContext,
  formatLlmPromptContextForSystem,
} from "./blueprint/llm-map/get-llm-prompt-context.js";

export { withRetry, PRD_RETRY_DELAYS_MS } from "./utils/retry.js";

export {
  QUEUE_NAMES,
  PIPELINE_QUEUE,
  PIPELINE_JOB_ORDER,
  PRD_PROGRESS_MESSAGES,
  progressMessageForStep,
  THEME_EVENT_TYPES,
  THEME_EVENTS_QUEUE,
  type PipelineJobData,
  type ThemeEventType,
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
  CompilerInputSchema,
  CompiledThemeOutputSchema,
  type CompilerInput,
  type CompiledThemeOutput,
} from "./compiler/types.js";

export {
  compileTheme,
  compileThemeAsAgentOutput,
  toCompilerOutput,
} from "./compiler/compile-theme.js";

export { UploadManifestSchema, type UploadManifest } from "./agents/types.js";

export {
  runSafetyPipeline,
  runJsonGate,
  runSchemaGate,
  runAssetGate,
  runSectionGate,
  runThemeGate,
  validateImageGuardrails,
  isSupportedShopifyFont,
  MAX_IMAGE_BYTES,
  MAX_MEGAPIXELS,
  type GateResult,
  type SafetyPipelineResult,
  type ValidationGateName,
} from "./validators/safety-pipeline.js";

export { ShopifyThemeClient } from "./shopify/theme-api.js";
export type { ThemeFileUpload } from "./shopify/theme-api.js";

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
  applyPreviewPatch,
  buildPreviewStateFromOutputs,
  disabledSectionIdsFromState,
  getAvailableSectionTypes,
  layoutSectionOrderFromState,
  previewStateToCompilerOutput,
} from "./preview/preview-state.js";

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
  ChatIntentLlmSchema,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ChatIntentLlm,
} from "./chat/types.js";

export {
  sanitizeChatMessage,
  sanitizePatchSettings,
  assertPatchesSafe,
  type SanitizeResult,
} from "./chat/sanitize.js";

export {
  parseChatIntentMock,
  resolveChatIntent,
  type ChatIntentContext,
  type ChatIntentResult,
} from "./chat/chat-intent.js";

export { ADVERSARIAL_CHAT_PROMPTS } from "./chat/adversarial-fixtures.js";

export {
  LiveThemeMetaSchema,
  PreviewApprovalMetaSchema,
  type LiveThemeMeta,
  type PreviewApprovalMeta,
} from "./agents/types.js";

export {
  ThemeSnapshotSchema,
  ApplyProjectRequestSchema,
  ApplyProjectResponseSchema,
  CreateVersionRequestSchema,
  CreateVersionResponseSchema,
  RollbackRequestSchema,
  RollbackResponseSchema,
  VersionListItemSchema,
  VersionListResponseSchema,
  type ThemeSnapshot,
  type ApplyProjectRequest,
  type ApplyProjectResponse,
  type CreateVersionRequest,
  type CreateVersionResponse,
  type RollbackRequest,
  type RollbackResponse,
  type VersionListItem,
  type VersionListResponse,
} from "./apply/types.js";

export {
  compilerToThemeFiles,
  buildSnapshotFromCompiler,
  buildSnapshotFromPreviewState,
  parseSnapshotFromThemeFiles,
} from "./apply/theme-snapshot.js";

// ─── Theme Intelligence Engine ────────────────────────────────────────────────

// L0: Token types
export {
  ColorTokensSchema,
  TypographyTokensSchema,
  SpacingTokensSchema,
  RadiusTokensSchema,
  ShadowTokensSchema,
  ButtonTokensSchema,
  AnimationTokensSchema,
  TokenRefsSchema,
  ResolvedTokensSchema,
  AllDesignTokensSchema,
  type ColorTokens,
  type TypographyTokens,
  type SpacingTokens,
  type RadiusTokens,
  type ShadowTokens,
  type ButtonTokens,
  type AnimationTokens,
  type TokenRefs,
  type ResolvedTokens,
  type AllDesignTokens,
} from "./intelligence/types/token-types.js";

// L1: Index types + section family
export {
  SectionFamilySchema,
  SectionRoleSchema,
  SectionIndexEntrySchema,
  PresetIndexEntrySchema,
  VariantIndexEntrySchema,
  TokenIndexEntrySchema,
  RelationshipIndexEntrySchema,
  SectionIndexSchema,
  PresetIndexSchema,
  VariantIndexSchema,
  TokenIndexSchema,
  RelationshipIndexSchema,
  type SectionFamily,
  type SectionRole,
  type SectionIndexEntry,
  type PresetIndexEntry,
  type VariantIndexEntry,
  type TokenIndexEntry,
  type SectionIndex,
  type PresetIndex,
  type VariantIndex,
  type TokenIndex,
  type RelationshipIndex,
} from "./intelligence/types/index-types.js";

// L2: Section catalog
export {
  SectionCatalogSchema,
  SectionMetadataSchema,
  SectionCompatibilityScoresSchema,
  SectionFlowRulesSchema,
  type SectionCatalog,
  type SectionMetadata,
  type SectionCompatibilityScores,
  type SectionFlowRules,
} from "./intelligence/types/catalog-types.js";

// AssetIntent (L9 - Phase 9)
export {
  AssetIntentSchema,
  type AssetIntent,
} from "./agents/types.js";

// L3: Preset catalog
export {
  PresetIdSchema,
  PresetCatalogSchema,
  PresetFlowSchema,
  PresetSlotSchema,
  SectionCountRulesSchema,
  PresetCharacteristicsSchema,
  type PresetId,
  type PresetCatalog,
  type PresetFlow,
  type PresetSlot,
} from "./intelligence/types/preset-types.js";

// L4: Variant catalog
export {
  SectionVariantSchema,
  VariantCatalogSchema,
  VariantSectionEntrySchema,
  VariantFamilyCatalogSchema,
  VariantFamilyIndexSchema,
  type SectionVariant,
  type VariantCatalog,
  type VariantSectionEntry,
  type VariantFamilyCatalog,
  type VariantFamilyIndex,
} from "./intelligence/types/variant-types.js";

// L5: Intelligence graph
export {
  DesignIntelligenceSchema,
  SlotEntrySchema,
  RelationshipFlowSchema,
  type DesignIntelligence,
  type SlotEntry,
  type RelationshipFlow,
} from "./intelligence/types/intelligence-types.js";

// Retrieval Engine
export { ThemeKnowledgeEngine } from "./intelligence/retrieval/engine.js";
export { PresetFlowEngine, presetFlowEngine } from "./intelligence/retrieval/preset-flow-engine.js";
export { formatForPrompt, formatSectionForPrompt, type ThemePromptContext } from "./intelligence/retrieval/context-assembler.js";

// Selection + Ordering Services
export {
  SectionSelectionService,
  InsufficientSectionsError,
  type SelectedSection,
} from "./intelligence/selection/section-selection.service.js";

export {
  OrderingEngine,
  InvalidSectionOrderError,
  type OrderedSection,
} from "./intelligence/ordering/ordering-engine.js";

// Builders (for generate:intelligence script)
export { buildAllTokenCatalogs } from "./intelligence/builders/build-token-catalogs.js";
export { buildSectionCatalog, buildAllSectionCatalogs } from "./intelligence/builders/build-section-catalogs.js";
export { ALL_PRESETS, getPresetById } from "./intelligence/builders/build-preset-catalogs.js";
export { ALL_VARIANT_FAMILIES, buildVariantFamilyIndex, getVariantFamilyFor, getBestSectionForFamily, buildVariantCatalog, getVariantsForSection, getBestVariantForPreset } from "./intelligence/builders/build-variant-catalogs.js";
export { buildAllRelationshipFlows } from "./intelligence/builders/build-relationship-graph.js";
export { buildSectionIndex, buildPresetIndex, buildVariantIndex, buildTokenIndex, buildRelationshipIndex } from "./intelligence/builders/build-indexes.js";
export { buildAll, type BuildAllInput, type BuildAllResult } from "./intelligence/builders/build-all.js";
export { buildBaseThemeCatalog, type BaseThemeTruth, type BaseThemeSection, type BaseThemeBlock, type BaseThemeSetting } from "./intelligence/builders/build-base-theme-catalog.js";
export { buildSnippetCatalog, type SnippetCatalog } from "./intelligence/builders/build-snippet-catalog.js";
export { buildBlockCatalog, type BlockCatalog } from "./intelligence/builders/build-block-catalog.js";
export { buildTemplateCatalog, type TemplateCatalog } from "./intelligence/builders/build-template-catalog.js";
export { buildDependencyGraph } from "./intelligence/builders/build-dependency-graph.js";

// New Services
export { VariantSelectionService } from "./intelligence/variant-selection/variant-selection.service.js";
export { TokenResolver } from "./intelligence/token-resolver/token-resolver.js";

// New types (L6 runtime intelligence + copy intelligence)
export {
  CopyIntelligenceSchema,
  type CopyIntelligence,
} from "./intelligence/types/preset-types.js";

export {
  RuntimeIntelligenceSchema,
  type RuntimeIntelligence,
} from "./intelligence/types/catalog-types.js";
