import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  QUEUE_DEFINITIONS,
  QUEUE_NAMES,
  buildQueueOptions,
  type QueueName,
} from "./queues.config.js";

/**
 * PlatformQueueService
 *
 * Manages named BullMQ queues for the Platform Layer.
 * The existing QueueService (pipeline queue) is NOT replaced — this service
 * adds the named queues defined in queues.config.ts alongside it.
 *
 * Usage:
 *   const queue = platformQueueService.getQueue('theme-publishing');
 *   await queue.add('publish', { projectId, shop, jobId });
 */
@Injectable()
export class PlatformQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(PlatformQueueService.name);
  private readonly queues = new Map<QueueName, Queue>();

  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const def = QUEUE_DEFINITIONS.find((d) => d.name === name);
      if (!def) throw new Error(`Unknown queue: ${name}`);
      const queue = new Queue(name, buildQueueOptions(def));
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async enqueue<T extends object>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: { jobId?: string },
  ): Promise<string> {
    if (!process.env.REDIS_URL?.trim()) {
      this.logger.debug(`[PlatformQueue] Redis disabled — skipping ${queueName}/${jobName}`);
      return `noop-${Date.now()}`;
    }

    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, opts);
    this.logger.debug(`[PlatformQueue] Enqueued ${queueName}/${jobName} (id: ${job.id})`);
    return job.id ?? "unknown";
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(
      [...this.queues.values()].map((q) => q.close()),
    );
  }
}
