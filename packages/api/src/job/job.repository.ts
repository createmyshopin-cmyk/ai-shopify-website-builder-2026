import { Injectable } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import type { ProjectJob } from "@prisma/client";

export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETE"
  | "FAILED"
  | "CANCELLED";

export interface CreateJobDto {
  projectId: string;
  type: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

export interface UpdateJobDto {
  status?: JobStatus;
  retries?: number;
  errors?: string;
  duration?: number;
  result?: Record<string, unknown>;
}

@Injectable()
export class JobRepository {
  async findById(id: string): Promise<ProjectJob | null> {
    return prisma.projectJob.findUnique({ where: { id } });
  }

  async findByIdempotencyKey(key: string): Promise<ProjectJob | null> {
    return prisma.projectJob.findUnique({ where: { idempotencyKey: key } });
  }

  async findByProject(
    projectId: string,
    opts?: { type?: string; status?: string },
  ): Promise<ProjectJob[]> {
    return prisma.projectJob.findMany({
      where: {
        projectId,
        ...(opts?.type ? { type: opts.type } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findOrphanedProcessing(olderThanMs: number): Promise<ProjectJob[]> {
    const threshold = new Date(Date.now() - olderThanMs);
    return prisma.projectJob.findMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: threshold },
        deletedAt: null,
      },
    });
  }

  async create(data: CreateJobDto): Promise<ProjectJob> {
    return prisma.projectJob.create({
      data: {
        projectId: data.projectId,
        type: data.type,
        status: "PENDING",
        idempotencyKey: data.idempotencyKey ?? null,
        payload: data.payload as object | undefined,
      },
    });
  }

  async update(id: string, data: UpdateJobDto): Promise<ProjectJob> {
    return prisma.projectJob.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.retries !== undefined ? { retries: data.retries } : {}),
        ...(data.errors !== undefined ? { errors: data.errors } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.result !== undefined ? { result: data.result as object } : {}),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.projectJob.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markFailed(id: string, error: string): Promise<ProjectJob> {
    const current = await prisma.projectJob.findUnique({ where: { id } });
    return prisma.projectJob.update({
      where: { id },
      data: {
        status: "FAILED",
        retries: (current?.retries ?? 0) + 1,
        errors: error,
      },
    });
  }
}
