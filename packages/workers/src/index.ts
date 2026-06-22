import "dotenv/config";

import { startPipelineWorker } from "../../api/src/workers/pipeline.worker.js";
import { startDlqWorker } from "../../api/src/queue/dlq.processor.js";
import { startPublishWorker } from "../../api/src/publishing/publish.worker.js";
import { PublishLockService } from "../../api/src/publishing/publish-lock.service.js";
import { Worker } from "bullmq";
import {
  QUEUE_DEFINITIONS,
  QUEUE_NAMES,
  buildWorkerOptions,
  redisConnection,
} from "../../api/src/queue/queues.config.js";
import { prisma } from "../../db/src/index.js";
import { Logger } from "@nestjs/common";

const logger = new Logger("Workers");

// ── Start legacy pipeline worker (unchanged) ──────────────────────────────────
const pipelineWorker = startPipelineWorker();

// ── Start DLQ worker ──────────────────────────────────────────────────────────
const dlqWorker = startDlqWorker();

// ── Start real publish worker (handles theme-publishing queue) ────────────────
// PublishLockService is instantiated directly here (no NestJS DI in this process).
const publishLockService = new PublishLockService();
const publishWorker = startPublishWorker(publishLockService);

// ── Start named platform queue workers ───────────────────────────────────────
// Each queue worker logs job lifecycle transitions and mirrors state to ProjectJob.
// NOTE: theme-publishing is handled by the dedicated publishWorker above — skip it here
// to avoid the stub falsely marking publish jobs COMPLETE without Shopify API calls.
const platformWorkers: Worker[] = [];

for (const def of QUEUE_DEFINITIONS) {
  // Skip queues that have dedicated real workers
  if (def.name === QUEUE_NAMES.THEME_PUBLISHING) continue;

  const worker = new Worker(
    def.name,
    async (job) => {
      const data      = job.data as Record<string, unknown>;
      const projectId = data?.["projectId"] as string | undefined;
      const jobDbId   = data?.["jobDbId"] as string | undefined;

      logger.debug(`[Worker:${def.name}] Processing job ${job.id} (project: ${projectId ?? "?"})`);

      // Mirror ACTIVE status to DB for tracked jobs
      if (jobDbId) {
        await prisma.projectJob.update({
          where: { id: jobDbId },
          data: { status: "PROCESSING" },
        }).catch(() => {});
      }

      // theme-events: persist compile-time events to ProjectEvent for audit traceability
      if (def.name === QUEUE_NAMES.THEME_EVENTS && projectId) {
        const durationMs = typeof data["durationMs"] === "number"
          ? ` (${data["durationMs"]}ms)` : "";
        await prisma.projectEvent.create({
          data: {
            projectId,
            step: job.name.toUpperCase().replace(/\./g, "_"),
            message: `Theme event: ${job.name}${durationMs}`,
            status: "INFO",
          },
        }).catch(() => {});
      }
    },
    {
      ...buildWorkerOptions(def),
    },
  );

  // Mirror COMPLETED status to DB
  worker.on("completed", async (job) => {
    const jobDbId = (job.data as Record<string, unknown>)?.["jobDbId"] as string | undefined;
    if (jobDbId) {
      await prisma.projectJob.update({
        where: { id: jobDbId },
        data: { status: "COMPLETE", duration: job.processedOn ? Date.now() - job.processedOn : undefined },
      }).catch(() => {});
    }
    logger.debug(`[Worker:${def.name}] Job ${job.id} completed`);
  });

  // Mirror FAILED status to DB and route to DLQ
  worker.on("failed", async (job, err) => {
    const jobDbId   = (job?.data as Record<string, unknown>)?.["jobDbId"] as string | undefined;
    const projectId = (job?.data as Record<string, unknown>)?.["projectId"] as string | undefined;

    if (jobDbId) {
      await prisma.projectJob.update({
        where: { id: jobDbId },
        data: {
          status: "FAILED",
          errors: err.message,
          retries: { increment: 1 },
        },
      }).catch(() => {});
    }

    // Route to DLQ if all attempts exhausted
    const maxAttempts = def.maxRetries + 1;
    if (job && (job.attemptsMade ?? 0) >= maxAttempts) {
      const dlq = new Worker(
        "theme-dlq",
        async () => {},
        { connection: redisConnection() },
      );
      // Enqueue to DLQ synchronously via direct queue add
      const { Queue } = await import("bullmq");
      const dlqQueue = new Queue("theme-dlq", { connection: redisConnection() });
      await dlqQueue.add("failed-job", {
        originalQueue: def.name,
        originalJobId: job.id,
        projectId,
        jobDbId,
        error: err.message,
        failedAt: new Date().toISOString(),
      }).catch(() => {});
      await dlqQueue.close();
      await dlq.close();
    }

    logger.error(`[Worker:${def.name}] Job ${job?.id} failed: ${err.message}`);
  });

  platformWorkers.push(worker);
}

logger.log(
  `[@theme-editor/workers] Started ${1 + platformWorkers.length + 2} workers ` +
  `(pipeline + ${platformWorkers.length} platform stubs + publish + dlq)`,
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(): Promise<void> {
  logger.log("[@theme-editor/workers] Shutting down...");
  await Promise.all([
    pipelineWorker.close(),
    dlqWorker.close(),
    publishWorker.close(),
    ...platformWorkers.map((w) => w.close()),
  ]);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
