import type { QueueOptions, WorkerOptions } from "bullmq";

/**
 * queues.config.ts
 *
 * Central configuration for all BullMQ queues in the Platform Layer.
 * Existing PIPELINE_QUEUE is defined in @theme-editor/shared and remains unchanged.
 * These queues ADD to the existing pipeline worker topology.
 */

export function redisConnection(): { url: string; maxRetriesPerRequest: null } {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null,
  };
}

export const QUEUE_NAMES = {
  THEME_GENERATION:  "theme-generation",
  COPY_GENERATION:   "copy-generation",
  IMAGE_GENERATION:  "image-generation",
  THEME_COMPILATION: "theme-compilation",
  THEME_PREVIEW:     "theme-preview",
  THEME_PUBLISHING:  "theme-publishing",
  THEME_EVENTS:      "theme-events",
  THEME_DLQ:         "theme-dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueDefinition {
  name: QueueName;
  concurrency: number;
  maxRetries: number;
  backoff: "exponential" | "fixed";
  backoffDelay: number; // ms
  removeOnComplete: number;
  removeOnFail: number;
}

export const QUEUE_DEFINITIONS: QueueDefinition[] = [
  {
    name: QUEUE_NAMES.THEME_GENERATION,
    concurrency: 5,
    maxRetries: 3,
    backoff: "exponential",
    backoffDelay: 2000,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  {
    name: QUEUE_NAMES.COPY_GENERATION,
    concurrency: 10,
    maxRetries: 3,
    backoff: "exponential",
    backoffDelay: 1000,
    removeOnComplete: 200,
    removeOnFail: 50,
  },
  {
    name: QUEUE_NAMES.IMAGE_GENERATION,
    concurrency: 5,
    maxRetries: 2,
    backoff: "fixed",
    backoffDelay: 5000,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  {
    name: QUEUE_NAMES.THEME_COMPILATION,
    concurrency: 5,
    maxRetries: 3,
    backoff: "exponential",
    backoffDelay: 2000,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
  {
    name: QUEUE_NAMES.THEME_PREVIEW,
    concurrency: 10,
    maxRetries: 2,
    backoff: "fixed",
    backoffDelay: 3000,
    removeOnComplete: 200,
    removeOnFail: 50,
  },
  {
    name: QUEUE_NAMES.THEME_PUBLISHING,
    concurrency: 2,
    maxRetries: 3,
    backoff: "exponential",
    backoffDelay: 5000,
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  {
    name: QUEUE_NAMES.THEME_EVENTS,
    concurrency: 20,
    maxRetries: 1,
    backoff: "fixed",
    backoffDelay: 1000,
    removeOnComplete: 1000,
    removeOnFail: 100,
  },
];

export function buildQueueOptions(def: QueueDefinition): QueueOptions {
  return {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: def.maxRetries + 1, // attempts = retries + 1 initial
      backoff:
        def.backoff === "exponential"
          ? { type: "exponential", delay: def.backoffDelay }
          : { type: "fixed", delay: def.backoffDelay },
      removeOnComplete: def.removeOnComplete,
      removeOnFail: def.removeOnFail,
    },
  };
}

export function buildWorkerOptions(def: QueueDefinition): Partial<WorkerOptions> {
  return {
    connection: redisConnection(),
    concurrency: def.concurrency,
  };
}
