import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  PIPELINE_QUEUE,
  PRD_RETRY_DELAYS_MS,
  pipelineFlowJobId,
  type EnqueuePipelineResponse,
  type PipelineJobData,
} from "@theme-editor/shared";
import { Queue, type ConnectionOptions } from "bullmq";

import { PipelineRunner } from "../agents/pipeline-runner.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import { ThemeCompilerService } from "../theme-compiler/theme-compiler.service.js";

function redisConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null,
  };
}

@Injectable()
export class QueueService {
  private queue: Queue<PipelineJobData> | null = null;

  constructor(
    @Inject(RealtimeService) private readonly realtime: RealtimeService,
    @Optional() @Inject(ThemeCompilerService) private readonly themeCompilerService?: ThemeCompilerService,
  ) {}

  isRedisEnabled(): boolean {
    return (
      process.env.USE_BULLMQ !== "false" && Boolean(process.env.REDIS_URL?.trim())
    );
  }

  private getQueue(): Queue<PipelineJobData> {
    if (this.queue) {
      return this.queue;
    }

    this.queue = new Queue<PipelineJobData>(PIPELINE_QUEUE, {
      connection: redisConnection(),
      defaultJobOptions: {
        attempts: 4,
        backoff: {
          type: "custom",
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    return this.queue;
  }

  async enqueuePipeline(
    options: {
      projectId: string;
      shop: string;
      products?: unknown[];
    },
    config: { allowSyncFallback?: boolean } = {},
  ): Promise<EnqueuePipelineResponse> {
    const allowSyncFallback = config.allowSyncFallback ?? true;

    if (!this.isRedisEnabled()) {
      if (!allowSyncFallback) {
        return {
          projectId: options.projectId,
          mode: "pending",
          status: "BLUEPRINT_READY",
          message:
            "Blueprint ready. Start Redis workers or POST /api/projects/run/:id.",
        };
      }

      const runner = new PipelineRunner(
        (event) => this.realtime.publish(event),
        this.themeCompilerService,
      );

      // Await synchronously so the HTTP response carries the final status.
      // This path is only used when Redis/BullMQ is disabled (dev / test / CI).
      // Production always uses the BullMQ path.
      const result = await runner
        .executeFull(options.projectId, options.shop, options.products)
        .catch((error: unknown) => {
          console.error(
            "[QueueService] Sync pipeline failed:",
            error instanceof Error ? error.message : error,
          );
          return { status: "AGENTS_FAILED", validationPassed: false };
        });

      return {
        projectId: options.projectId,
        mode: "sync",
        status: result.status,
        validationPassed: result.validationPassed,
        message: result.validationPassed
          ? "Pipeline completed successfully"
          : "Pipeline completed with errors",
      };
    }

    const queue = this.getQueue();
    const jobId = pipelineFlowJobId(options.projectId);

    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "active" || state === "waiting" || state === "delayed") {
        return {
          projectId: options.projectId,
          mode: "queued",
          status: "AGENTS_RUNNING",
          message: "Pipeline already queued",
        };
      }
    }

    await queue.add(
      "pipeline-step",
      {
        projectId: options.projectId,
        shop: options.shop,
        step: "VISION",
        products: options.products,
      },
      { jobId },
    );

    return {
      projectId: options.projectId,
      mode: "queued",
      status: "AGENTS_RUNNING",
      message: "Pipeline enqueued on BullMQ",
    };
  }
}

export function bullmqBackoffStrategy(attemptsMade: number): number {
  return PRD_RETRY_DELAYS_MS[attemptsMade - 1] ?? 20_000;
}
