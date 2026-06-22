import { Logger } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import { prisma } from "@theme-editor/db";
import { redisConnection, QUEUE_NAMES } from "./queues.config.js";

const logger = new Logger("DlqProcessor");

/**
 * DlqProcessor
 *
 * Processes jobs that have exhausted all retries and landed in the DLQ.
 * Actions:
 *   1. Record failure in ProjectJob
 *   2. Emit PIPELINE_FAILED ProjectEvent
 *   3. Log for alerting
 */
export function startDlqWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.THEME_DLQ,
    async (job: Job) => {
      const projectId = (job.data as Record<string, unknown>)?.["projectId"] as string | undefined;
      const originalQueue = (job.data as Record<string, unknown>)?.["originalQueue"] as string | undefined;
      const errorMessage = (job.data as Record<string, unknown>)?.["error"] as string | undefined;

      logger.error(
        `[DLQ] Failed job received — queue: ${originalQueue ?? "unknown"}, ` +
        `project: ${projectId ?? "unknown"}, job: ${job.id}`,
      );

      if (projectId) {
        try {
          await prisma.projectEvent.create({
            data: {
              projectId,
              step: "PIPELINE_FAILED",
              message: `Job failed after all retries: ${errorMessage ?? "Unknown error"} (queue: ${originalQueue ?? "unknown"})`,
              status: "ERROR",
            },
          });

          // Update project status to AGENTS_FAILED if currently running
          const project = await prisma.designProject.findUnique({
            where: { id: projectId },
            select: { status: true },
          });

          if (project?.status === "AGENTS_RUNNING") {
            await prisma.designProject.update({
              where: { id: projectId },
              data: { status: "AGENTS_FAILED" },
            });
          }
        } catch (dbErr) {
          logger.error(`[DLQ] Failed to record DLQ event: ${String(dbErr)}`);
        }
      }
    },
    {
      connection: redisConnection(),
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error(`[DLQ] Worker failed for job ${job?.id}: ${err.message}`);
  });

  return worker;
}
