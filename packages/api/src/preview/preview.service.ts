import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import { PreviewSessionRepository } from "./preview-session.repository.js";
import { PreviewBroadcastService } from "./preview-broadcast.service.js";
import { JobService } from "../job/job.service.js";
import { AuditService } from "../event/audit.service.js";
import { QueueService } from "../queue/queue.service.js";
import { PlatformQueueService } from "../queue/platform-queue.service.js";
import { QUEUE_NAMES } from "../queue/queues.config.js";
import type { PreviewSession } from "@prisma/client";

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface StartPreviewDto {
  projectId: string;
  shop: string;
  merchantId: string;
  idempotencyKey?: string;
  previewState?: object;
}

export interface PreviewSessionResult {
  jobId: string;
  sessionToken: string;
  expiresAt: string;
}

export interface PreviewPatchResult {
  sessionToken: string;
  updatedAt: string;
}

/**
 * PreviewService
 *
 * Manages PreviewSession lifecycle:
 *   1. Create session with TTL + sessionToken
 *   2. Enqueue theme-preview job for initial asset upload
 *   3. Apply patch ops (via existing PreviewEditService contract)
 *   4. Broadcast PREVIEW_UPDATED via Supabase Realtime (hot reload)
 *   5. Session cleanup (soft-delete expired sessions)
 */
@Injectable()
export class PreviewService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PreviewService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(PreviewSessionRepository) private readonly sessionRepo: PreviewSessionRepository,
    @Inject(PreviewBroadcastService) private readonly broadcast: PreviewBroadcastService,
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(QueueService) private readonly queueService: QueueService,
    @Inject(PlatformQueueService) private readonly platformQueue: PlatformQueueService,
  ) {}

  onApplicationBootstrap(): void {
    this.cleanupInterval = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async startPreview(dto: StartPreviewDto): Promise<PreviewSessionResult> {
    // Idempotency: reuse active session for the same project
    if (dto.idempotencyKey) {
      const existing = await this.jobService.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        const session = await this.sessionRepo.findActiveByProject(dto.projectId);
        if (session) {
          return {
            jobId: existing.jobId,
            sessionToken: session.sessionToken,
            expiresAt: session.expiresAt.toISOString(),
          };
        }
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

    // Create preview session
    const session = await this.sessionRepo.create({
      projectId: dto.projectId,
      shop: dto.shop,
      merchantId: dto.merchantId,
      ttlMinutes: 30,
      previewState: dto.previewState,
    });

    // Create job record
    const job = await this.jobService.createJob({
      projectId: dto.projectId,
      type: "THEME_PREVIEW",
      idempotencyKey: dto.idempotencyKey,
      payload: { sessionToken: session.sessionToken, shop: dto.shop },
    });

    await this.audit.record({
      projectId: dto.projectId,
      step: "PREVIEW_STARTED",
      message: `Preview session created (token: ${session.sessionToken.substring(0, 8)}...)`,
      status: "INFO",
    });

    // Enqueue preview job for asset upload to draft theme
    await this.queueService.enqueuePipeline(
      { projectId: dto.projectId, shop: dto.shop },
      { allowSyncFallback: false },
    );

    await this.jobService.markProcessing(job.id);

    this.logger.log(
      `[PreviewService] Preview started for project ${dto.projectId}`,
    );

    return {
      jobId: job.id,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async validateSession(
    sessionToken: string,
    shop: string,
  ): Promise<PreviewSession> {
    const session = await this.sessionRepo.findByToken(sessionToken);
    if (!session) {
      throw new UnauthorizedException("Preview session expired or invalid");
    }
    if (session.shop !== shop) {
      throw new ForbiddenException("Preview session does not belong to this shop");
    }
    return session;
  }

  async applyPreviewPatch(
    sessionToken: string,
    shop: string,
    patch: object,
  ): Promise<PreviewPatchResult> {
    const session = await this.validateSession(sessionToken, shop);

    const currentState = (session.previewState as object | null) ?? {};
    const newState = { ...(currentState as Record<string, unknown>), ...(patch as Record<string, unknown>) };

    await this.sessionRepo.updatePreviewState(session.id, newState);

    await this.audit.record({
      projectId: session.projectId,
      step: "PREVIEW_PATCHED",
      message: "Preview state updated",
      status: "INFO",
    });

    // Broadcast hot-reload signal to connected clients
    await this.broadcast.broadcastPreviewUpdated(
      session.projectId,
      sessionToken,
      { patchKeys: Object.keys(patch as Record<string, unknown>) },
    );

    return {
      sessionToken,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enqueue copy regeneration for a preview session.
   * Re-runs only the Copy agent (not full pipeline) and broadcasts result.
   */
  async regenerateCopy(
    sessionToken: string,
    shop: string,
  ): Promise<{ jobId: string }> {
    const session = await this.validateSession(sessionToken, shop);

    const job = await this.jobService.createJob({
      projectId: session.projectId,
      type: "COPY_REGENERATION",
      payload: { sessionToken, shop },
    });

    // Enqueue on copy-generation queue for the worker to re-run the Copy agent
    await this.platformQueue.enqueue(
      QUEUE_NAMES.COPY_GENERATION,
      "regenerate-copy",
      {
        projectId: session.projectId,
        sessionToken,
        shop,
        jobDbId: job.id,
      },
      { jobId: job.id },
    );

    await this.audit.record({
      projectId: session.projectId,
      step: "COPY_REGEN_STARTED",
      message: `Copy regeneration enqueued (job: ${job.id})`,
      status: "INFO",
    });

    return { jobId: job.id };
  }

  /**
   * Enqueue image regeneration for a preview session.
   */
  async regenerateImages(
    sessionToken: string,
    shop: string,
  ): Promise<{ jobId: string }> {
    const session = await this.validateSession(sessionToken, shop);

    const job = await this.jobService.createJob({
      projectId: session.projectId,
      type: "IMAGE_REGENERATION",
      payload: { sessionToken, shop },
    });

    // Enqueue on image-generation queue for the worker to re-run the Image agent
    await this.platformQueue.enqueue(
      QUEUE_NAMES.IMAGE_GENERATION,
      "regenerate-images",
      {
        projectId: session.projectId,
        sessionToken,
        shop,
        jobDbId: job.id,
      },
      { jobId: job.id },
    );

    await this.audit.record({
      projectId: session.projectId,
      step: "IMAGE_REGEN_STARTED",
      message: `Image regeneration enqueued (job: ${job.id})`,
      status: "INFO",
    });

    return { jobId: job.id };
  }

  async getSessionByToken(token: string): Promise<PreviewSession> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session) {
      throw new NotFoundException("Preview session not found or expired");
    }
    return session;
  }

  async expireSession(sessionToken: string, shop: string): Promise<void> {
    const session = await this.validateSession(sessionToken, shop);
    await this.sessionRepo.softDelete(session.id);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const count = await this.sessionRepo.cleanupExpired();
    if (count > 0) {
      this.logger.log(`[PreviewService] Cleaned up ${count} expired preview sessions`);
    }
    return count;
  }
}
