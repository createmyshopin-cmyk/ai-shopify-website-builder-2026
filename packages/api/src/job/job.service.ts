import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { JobRepository, type CreateJobDto, type UpdateJobDto, type JobStatus } from "./job.repository.js";
import type { ProjectJob } from "@prisma/client";

export interface JobStatusDto {
  jobId: string;
  type: string;
  status: string;
  retries: number;
  errors: string | null;
  duration: number | null;
  result: unknown;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(@Inject(JobRepository) private readonly repo: JobRepository) {}

  async getJobStatus(jobId: string, projectId: string): Promise<JobStatusDto> {
    const job = await this.repo.findById(jobId);
    if (!job || job.projectId !== projectId) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return this.toDto(job);
  }

  async getJobsForProject(
    projectId: string,
    opts?: { type?: string; status?: string },
  ): Promise<JobStatusDto[]> {
    const jobs = await this.repo.findByProject(projectId, opts);
    return jobs.map((j) => this.toDto(j));
  }

  async findByIdempotencyKey(key: string): Promise<JobStatusDto | null> {
    const job = await this.repo.findByIdempotencyKey(key);
    return job ? this.toDto(job) : null;
  }

  async createJob(data: CreateJobDto): Promise<ProjectJob> {
    return this.repo.create(data);
  }

  async updateJobStatus(id: string, data: UpdateJobDto): Promise<ProjectJob> {
    return this.repo.update(id, data);
  }

  async markProcessing(id: string): Promise<ProjectJob> {
    return this.repo.update(id, { status: "PROCESSING" as JobStatus });
  }

  async markComplete(id: string, result?: Record<string, unknown>): Promise<ProjectJob> {
    return this.repo.update(id, { status: "COMPLETE" as JobStatus, result });
  }

  async markFailed(id: string, error: string): Promise<ProjectJob> {
    this.logger.warn(`[JobService] Job ${id} failed: ${error}`);
    return this.repo.markFailed(id, error);
  }

  async recoverOrphanedJobs(thresholdMs: number = 10 * 60 * 1000): Promise<number> {
    const orphans = await this.repo.findOrphanedProcessing(thresholdMs);
    if (orphans.length === 0) return 0;

    this.logger.warn(`[JobService] Found ${orphans.length} orphaned PROCESSING jobs`);

    await Promise.all(
      orphans.map((job) =>
        this.repo.markFailed(job.id, "Orphaned: job was in PROCESSING state for too long"),
      ),
    );

    return orphans.length;
  }

  private toDto(job: ProjectJob): JobStatusDto {
    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      retries: job.retries,
      errors: job.errors ?? null,
      duration: job.duration ?? null,
      result: job.result ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
