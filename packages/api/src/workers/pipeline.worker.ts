import "dotenv/config";

import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { INestApplicationContext } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  PIPELINE_QUEUE,
  pipelineFlowJobId,
  pipelineStepJobId,
  type PipelineJobData,
} from "@theme-editor/shared";
import {
  Queue,
  Worker,
  type ConnectionOptions,
  type Job,
} from "bullmq";

import {
  getNextPipelineStep,
  PipelineRunner,
} from "../agents/pipeline-runner.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { RealtimeService } from "../realtime/realtime.service.js";
import { ThemeCompilerModule } from "../theme-compiler/theme-compiler.module.js";
import { ThemeCompilerService } from "../theme-compiler/theme-compiler.service.js";
import { bullmqBackoffStrategy } from "../queue/queue.service.js";

// ── Minimal NestJS module for the worker process ──────────────────────────────
// Imports ThemeCompilerModule (intelligence engine) and RealtimeModule (event
// publish) so both services are wired via DI — no manual instantiation needed.
@Module({ imports: [ThemeCompilerModule, RealtimeModule] })
class WorkerAppModule {}

let _appContext: INestApplicationContext | undefined;
let _themeCompilerService: ThemeCompilerService | undefined;
let _realtimeService: RealtimeService | undefined;

/**
 * Lazily bootstraps a NestJS application context on the first job. The context
 * and resolved services are reused for all subsequent jobs in this process.
 */
async function getWorkerServices(): Promise<{
  themeCompilerService: ThemeCompilerService;
  realtimeService: RealtimeService;
}> {
  if (!_themeCompilerService || !_realtimeService) {
    _appContext = await NestFactory.createApplicationContext(WorkerAppModule, {
      logger: ["error", "warn"],
    });
    _themeCompilerService = _appContext.get(ThemeCompilerService);
    _realtimeService = _appContext.get(RealtimeService);
  }
  return {
    themeCompilerService: _themeCompilerService as ThemeCompilerService,
    realtimeService: _realtimeService as RealtimeService,
  };
}

export function createRedisConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null,
  };
}

async function processPipelineStep(
  job: Job<PipelineJobData>,
  connection: ConnectionOptions,
): Promise<void> {
  const { themeCompilerService, realtimeService } = await getWorkerServices();
  const runner = new PipelineRunner(
    (event) => realtimeService.publish(event),
    themeCompilerService,
  );

  await prisma.designProject.update({
    where: { id: job.data.projectId },
    data: { status: "AGENTS_RUNNING" },
  });

  await runner.executeStep(
    job.data.projectId,
    job.data.shop,
    job.data.step,
    job.data.products,
  );

  const next = getNextPipelineStep(job.data.step);
  if (!next) {
    return;
  }

  const queue = new Queue<PipelineJobData>(PIPELINE_QUEUE, { connection });
  await queue.add(
    "pipeline-step",
    { ...job.data, step: next },
    {
      jobId: pipelineStepJobId(job.data.projectId, next),
      removeOnComplete: true,
    },
  );
  await queue.close();
}

export function startPipelineWorker(): Worker<PipelineJobData> {
  const connection = createRedisConnection();

  const worker = new Worker<PipelineJobData>(
    PIPELINE_QUEUE,
    async (job) => processPipelineStep(job, connection),
    {
      connection,
      settings: {
        backoffStrategy: bullmqBackoffStrategy,
      },
    },
  );

  worker.on("completed", (job) => {
    console.info(
      `[pipeline-worker] completed ${job.data.step} for ${job.data.projectId}`,
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[pipeline-worker] failed ${job?.data.step ?? "unknown"}:`,
      error.message,
    );
  });

  console.info(
    `[pipeline-worker] listening on ${PIPELINE_QUEUE} (${process.env.REDIS_URL ?? "redis://localhost:6379"})`,
  );

  return worker;
}

export async function enqueuePipelineJob(
  data: PipelineJobData,
  connection: ConnectionOptions = createRedisConnection(),
): Promise<void> {
  const queue = new Queue<PipelineJobData>(PIPELINE_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "custom" },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  await queue.add("pipeline-step", data, {
    jobId: pipelineFlowJobId(data.projectId),
  });
  await queue.close();
}
