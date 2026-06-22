import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import { PublishingRepository } from "./publishing.repository.js";
import { PublishLockService } from "./publish-lock.service.js";
import { ThemeVersionService } from "../theme-version/theme-version.service.js";
import { JobService } from "../job/job.service.js";
import { AuditService } from "../event/audit.service.js";
import { PlatformQueueService } from "../queue/platform-queue.service.js";
import { QUEUE_NAMES } from "../queue/queues.config.js";

export interface StartPublishDto {
  projectId: string;
  shop: string;
  merchantId: string;
  idempotencyKey?: string;
  versionId?: string;
}

export interface PublishJobResult {
  jobId: string;
  projectId: string;
}

export interface StartRollbackDto {
  projectId: string;
  versionId: string;
  shop: string;
  merchantId: string;
  idempotencyKey?: string;
}

/**
 * PublishingService
 *
 * Orchestrates the publish flow:
 *   Validate → AcquireLock → EnqueueJob → 202 Accepted
 *
 * The actual Shopify API calls (themeCreate, themePublish, themeFilesUpsert)
 * happen inside the BullMQ worker via the existing upload.processor.ts.
 *
 * This service handles:
 *   - Distributed locking (one publish per shop at a time)
 *   - Idempotency (duplicate requests return existing job)
 *   - Job tracking
 *   - Rollback orchestration
 */
@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    @Inject(PublishingRepository) private readonly repo: PublishingRepository,
    @Inject(PublishLockService) private readonly lock: PublishLockService,
    @Inject(ThemeVersionService) private readonly versionService: ThemeVersionService,
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(PlatformQueueService) private readonly platformQueue: PlatformQueueService,
  ) {}

  async startPublish(dto: StartPublishDto): Promise<PublishJobResult> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.jobService.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return { jobId: existing.jobId, projectId: dto.projectId };
      }
    }

    // Verify project ownership
    const project = await prisma.designProject.findFirst({
      where: { id: dto.projectId, shop: dto.shop, deletedAt: null },
    });
    if (!project) {
      throw new ForbiddenException(
        `Project ${dto.projectId} not found or access denied`,
      );
    }

    // Verify pipeline completed
    if (
      project.status !== "AGENTS_COMPLETE" &&
      project.status !== "UPLOAD_COMPLETE" &&
      project.status !== "VALIDATION_COMPLETE"
    ) {
      throw new BadRequestException(
        `Project ${dto.projectId} is in status ${project.status} — pipeline must complete before publish`,
      );
    }

    // Create job first (so we have a jobId for the lock value)
    const job = await this.jobService.createJob({
      projectId: dto.projectId,
      type: "THEME_PUBLISHING",
      idempotencyKey: dto.idempotencyKey,
      payload: { shop: dto.shop, merchantId: dto.merchantId, versionId: dto.versionId },
    });

    // Acquire distributed lock (throws ConflictException if another publish is in progress)
    await this.lock.acquire(dto.shop, job.id);

    // Enqueue BullMQ job for the publish worker to execute Shopify API calls
    await this.platformQueue.enqueue(
      QUEUE_NAMES.THEME_PUBLISHING,
      "publish",
      {
        projectId: dto.projectId,
        shop: dto.shop,
        merchantId: dto.merchantId,
        jobDbId: job.id,
        versionId: dto.versionId,
      },
      { jobId: job.id },
    );

    await this.jobService.markProcessing(job.id);

    await this.audit.record({
      projectId: dto.projectId,
      step: "PUBLISH_STARTED",
      message: `Publish job enqueued (job: ${job.id})`,
      status: "INFO",
    });

    this.logger.log(
      `[Publishing] Publish started for project ${dto.projectId} (job: ${job.id})`,
    );

    return { jobId: job.id, projectId: dto.projectId };
  }

  async completePublish(
    jobId: string,
    projectId: string,
    shop: string,
    shopifyThemeId: string,
    versionSnapshot: object,
  ): Promise<void> {
    try {
      // Create published version record
      const version = await this.versionService.publishVersion(
        await this.getDraftVersionId(projectId) ?? "__none__",
        shop,
        shopifyThemeId,
      ).catch(async () => {
        // If no draft version exists, create one now from the snapshot
        const draft = await this.versionService.createDraft(projectId, shop, versionSnapshot);
        return this.versionService.publishVersion(draft.id, shop, shopifyThemeId);
      });

      // Record in PublishedTheme
      await this.repo.create({
        projectId,
        shop,
        merchantId: shop,
        shopifyThemeId,
        versionId: version.id,
      });

      // Update project status
      await prisma.designProject.update({
        where: { id: projectId },
        data: { status: "PUBLISHED", publishedThemeId: shopifyThemeId },
      });

      await this.audit.record({
        projectId,
        step: "PUBLISH_COMPLETE",
        message: `Theme published (Shopify ID: ${shopifyThemeId})`,
        status: "SUCCESS",
      });

      this.logger.log(`[Publishing] Publish complete for project ${projectId}`);
    } finally {
      await this.lock.release(shop, jobId);
    }
  }

  async failPublish(jobId: string, shop: string, projectId: string, error: string): Promise<void> {
    await this.lock.release(shop, jobId);
    await this.jobService.markFailed(jobId, error);

    await this.audit.record({
      projectId,
      step: "PUBLISH_FAILED",
      message: `Publish failed: ${error}`,
      status: "ERROR",
    });
  }

  async startRollback(dto: StartRollbackDto): Promise<PublishJobResult> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.jobService.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return { jobId: existing.jobId, projectId: dto.projectId };
      }
    }

    // Verify ownership
    const project = await prisma.designProject.findFirst({
      where: { id: dto.projectId, shop: dto.shop, deletedAt: null },
    });
    if (!project) {
      throw new ForbiddenException(`Project ${dto.projectId} not found or access denied`);
    }

    // Verify the target version exists and belongs to this project
    const targetVersion = await this.versionService.getVersion(dto.versionId, dto.shop);
    if (targetVersion.projectId !== dto.projectId) {
      throw new BadRequestException("Version does not belong to this project");
    }

    const job = await this.jobService.createJob({
      projectId: dto.projectId,
      type: "THEME_ROLLBACK",
      idempotencyKey: dto.idempotencyKey,
      payload: { shop: dto.shop, versionId: dto.versionId, merchantId: dto.merchantId },
    });

    // Acquire lock for rollback (same shop-level lock as publish)
    await this.lock.acquire(dto.shop, job.id);

    // Enqueue BullMQ job for the publish worker to execute the rollback
    await this.platformQueue.enqueue(
      QUEUE_NAMES.THEME_PUBLISHING,
      "rollback",
      {
        projectId: dto.projectId,
        shop: dto.shop,
        merchantId: dto.merchantId,
        jobDbId: job.id,
        versionId: dto.versionId,
      },
      { jobId: job.id },
    );

    await this.jobService.markProcessing(job.id);

    await this.audit.record({
      projectId: dto.projectId,
      step: "ROLLBACK_STARTED",
      message: `Rollback to version ${dto.versionId} started (job: ${job.id})`,
      status: "INFO",
    });

    return { jobId: job.id, projectId: dto.projectId };
  }

  async completeRollback(
    jobId: string,
    projectId: string,
    shop: string,
    versionId: string,
    shopifyThemeId: string,
  ): Promise<void> {
    try {
      // Create rollback version entry
      await this.versionService.rollbackTo(versionId, shop);

      // Mark old published theme as rolled back
      const currentPublished = await this.repo.findActiveByProject(projectId);
      if (currentPublished) {
        await this.repo.markRolledBack(currentPublished.id);
      }

      // Create new published theme record for the rolled-back version
      await this.repo.create({
        projectId,
        shop,
        merchantId: shop,
        shopifyThemeId,
        versionId,
      });

      await this.audit.record({
        projectId,
        step: "ROLLBACK_COMPLETE",
        message: `Rolled back to version ${versionId}`,
        status: "SUCCESS",
      });

      this.logger.log(`[Publishing] Rollback complete for project ${projectId}`);
    } finally {
      await this.lock.release(shop, jobId);
    }
  }

  async getPublishHistory(projectId: string, shop: string) {
    const project = await prisma.designProject.findFirst({
      where: { id: projectId, shop, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return this.repo.getHistoryByProject(projectId);
  }

  private async getDraftVersionId(projectId: string): Promise<string | null> {
    const versions = await prisma.themeVersion.findFirst({
      where: { projectId, status: "DRAFT", deletedAt: null },
      orderBy: { versionNumber: "desc" },
    });
    return versions?.id ?? null;
  }
}
