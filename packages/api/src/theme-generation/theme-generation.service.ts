import {
  Inject,
  Injectable,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import { QueueService } from "../queue/queue.service.js";
import { JobService } from "../job/job.service.js";
import { AuditService } from "../event/audit.service.js";

export interface StartGenerationDto {
  projectId: string;
  shop: string;
  merchantId: string;
  idempotencyKey?: string;
}

export interface GenerationEnqueueResult {
  jobId: string;
  projectId: string;
  mode: "queued" | "sync" | "pending" | "duplicate";
}

/**
 * ThemeGenerationService
 *
 * Orchestrates theme generation requests for the /themes/generate endpoint.
 * Delegates actual pipeline execution to QueueService (existing, immutable).
 * Adds idempotency, audit logging, and job tracking on top.
 */
@Injectable()
export class ThemeGenerationService {
  private readonly logger = new Logger(ThemeGenerationService.name);

  constructor(
    @Inject(QueueService) private readonly queueService: QueueService,
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async startGeneration(dto: StartGenerationDto): Promise<GenerationEnqueueResult> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.jobService.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        this.logger.log(
          `[ThemeGeneration] Duplicate request detected — returning existing job ${existing.jobId}`,
        );
        return {
          jobId: existing.jobId,
          projectId: dto.projectId,
          mode: "duplicate",
        };
      }
    }

    // Ensure no active generation job for this project
    const activeJobs = await this.jobService.getJobsForProject(dto.projectId, {
      type: "THEME_GENERATION",
      status: "PROCESSING",
    });
    if (activeJobs.length > 0) {
      throw new ConflictException(
        `A generation job is already running for project ${dto.projectId}`,
      );
    }

    // Create a job record for tracking
    const job = await this.jobService.createJob({
      projectId: dto.projectId,
      type: "THEME_GENERATION",
      idempotencyKey: dto.idempotencyKey,
      payload: { shop: dto.shop, merchantId: dto.merchantId },
    });

    await this.audit.record({
      projectId: dto.projectId,
      step: "GENERATION_STARTED",
      message: `Theme generation enqueued (job: ${job.id})`,
      status: "INFO",
    });

    // Delegate to existing QueueService (no modification)
    const enqueueResult = await this.queueService.enqueuePipeline(
      { projectId: dto.projectId, shop: dto.shop },
      { allowSyncFallback: false },
    );

    await this.jobService.markProcessing(job.id);

    this.logger.log(
      `[ThemeGeneration] Enqueued project ${dto.projectId} — mode: ${enqueueResult.mode}`,
    );

    return {
      jobId: job.id,
      projectId: dto.projectId,
      mode: enqueueResult.mode as GenerationEnqueueResult["mode"],
    };
  }

  async getProjectStatus(projectId: string, shop: string): Promise<{
    projectId: string;
    status: string;
    jobs: Array<{ type: string; status: string }>;
  }> {
    const project = await prisma.designProject.findFirst({
      where: { id: projectId, shop, deletedAt: null },
      include: { jobs: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found or access denied`);
    }

    return {
      projectId: project.id,
      status: project.status,
      jobs: project.jobs.map((j) => ({ type: j.type, status: j.status })),
    };
  }
}
