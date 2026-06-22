import type { JobType } from "../index.js";

// ─── Theme Event Types (BullMQ) ───────────────────────────────────────────────

export const THEME_EVENT_TYPES = {
  THEME_COMPILED:   "theme.compiled",
  SECTION_ORDERED:  "section.ordered",
  VARIANT_SELECTED: "variant.selected",
  VALIDATION_FAILED:"validation.failed",
  PRESET_SELECTED:  "preset.selected",
} as const;

export type ThemeEventType = typeof THEME_EVENT_TYPES[keyof typeof THEME_EVENT_TYPES];

export const THEME_EVENTS_QUEUE = "theme-events";

export const QUEUE_NAMES = {
  VISION: "vision",
  COPY: "copy",
  IMAGE: "image",
  LAYOUT: "layout",
  COMPILER: "compiler",
  UPLOAD: "upload",
  VALIDATION: "validation",
} as const satisfies Record<JobType, string>;

export const PIPELINE_QUEUE = "theme-pipeline";

export const PIPELINE_JOB_ORDER: JobType[] = [
  "VISION",
  "COPY",
  "IMAGE",
  "LAYOUT",
  "COMPILER",
  "UPLOAD",
  "VALIDATION",
];

export interface PipelineJobData {
  projectId: string;
  shop: string;
  step: JobType;
  products?: unknown[];
}

export const PRD_PROGRESS_MESSAGES: Record<string, string> = {
  VISION: "Analyzing Product",
  COPY: "Analyzing Product",
  IMAGE: "Generating Assets",
  LAYOUT: "Compiling Theme",
  COMPILER: "Compiling Theme",
  UPLOAD: "Uploading Images",
  VALIDATION: "Validating",
  PREVIEW_READY: "Preview Ready",
};

export function progressMessageForStep(
  step: JobType | "PREVIEW_READY",
): string {
  return PRD_PROGRESS_MESSAGES[step] ?? step;
}
