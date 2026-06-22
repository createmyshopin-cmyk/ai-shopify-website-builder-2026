import { Injectable, Logger } from "@nestjs/common";
import { Queue, type ConnectionOptions } from "bullmq";

import { THEME_EVENT_TYPES, THEME_EVENTS_QUEUE, type ThemeEventType } from "@theme-editor/shared";

// ─── Theme Events Service ─────────────────────────────────────────────────────
// Emits BullMQ events onto the theme-events queue.
// Each event corresponds to a significant step in the compilation pipeline.

export interface ThemeEventPayload {
  projectId: string;
  presetId?: string;
  sectionTypes?: string[];
  variantSelections?: Record<string, string>;
  validationErrors?: string[];
  compiledAt?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

function redisConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null,
  };
}

@Injectable()
export class ThemeEventsService {
  private readonly logger = new Logger(ThemeEventsService.name);
  private queue: Queue | null = null;

  private getQueue(): Queue | null {
    if (!process.env.REDIS_URL?.trim()) return null;
    if (!this.queue) {
      this.queue = new Queue(THEME_EVENTS_QUEUE, { connection: redisConnection() });
    }
    return this.queue;
  }

  async emit(eventType: ThemeEventType, payload: ThemeEventPayload): Promise<void> {
    const queue = this.getQueue();
    if (!queue) {
      this.logger.debug(`[ThemeEvents] Redis disabled — skipping event: ${eventType}`);
      return;
    }

    try {
      await queue.add(eventType, payload, {
        removeOnComplete: { count: 1000 },
        removeOnFail:    { count: 100 },
      });
      this.logger.debug(`[ThemeEvents] Emitted: ${eventType} (project: ${payload.projectId})`);
    } catch (err) {
      this.logger.warn(`[ThemeEvents] Failed to emit ${eventType}: ${String(err)}`);
    }
  }

  async emitPresetSelected(projectId: string, presetId: string): Promise<void> {
    await this.emit(THEME_EVENT_TYPES.PRESET_SELECTED, { projectId, presetId });
  }

  async emitSectionOrdered(projectId: string, sectionTypes: string[]): Promise<void> {
    await this.emit(THEME_EVENT_TYPES.SECTION_ORDERED, { projectId, sectionTypes });
  }

  async emitVariantSelected(
    projectId: string,
    variantSelections: Record<string, string>,
  ): Promise<void> {
    await this.emit(THEME_EVENT_TYPES.VARIANT_SELECTED, { projectId, variantSelections });
  }

  async emitThemeCompiled(
    projectId: string,
    presetId: string,
    durationMs: number,
  ): Promise<void> {
    await this.emit(THEME_EVENT_TYPES.THEME_COMPILED, {
      projectId,
      presetId,
      durationMs,
      compiledAt: new Date().toISOString(),
    });
  }

  async emitValidationFailed(
    projectId: string,
    validationErrors: string[],
  ): Promise<void> {
    await this.emit(THEME_EVENT_TYPES.VALIDATION_FAILED, { projectId, validationErrors });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queue?.close();
    } catch {
      // Suppress connection-close errors during graceful shutdown
    }
  }
}
