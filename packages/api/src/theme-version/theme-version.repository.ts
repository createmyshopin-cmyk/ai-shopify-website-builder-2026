import { Injectable } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import type { ThemeVersion } from "@prisma/client";

export type VersionStatus = "DRAFT" | "PUBLISHED" | "ROLLBACK" | "RESTORE";

export interface CreateThemeVersionDto {
  projectId: string;
  snapshot: object;
  createdBy: string;
  status?: VersionStatus;
  shopifyThemeId?: string;
  restoredFromId?: string;
}

@Injectable()
export class ThemeVersionRepository {
  async findByProject(
    projectId: string,
    opts?: { status?: VersionStatus; includeDeleted?: boolean },
  ): Promise<ThemeVersion[]> {
    return prisma.themeVersion.findMany({
      where: {
        projectId,
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { versionNumber: "desc" },
    });
  }

  async findById(id: string): Promise<ThemeVersion | null> {
    return prisma.themeVersion.findUnique({ where: { id } });
  }

  async findLatestPublished(projectId: string): Promise<ThemeVersion | null> {
    return prisma.themeVersion.findFirst({
      where: { projectId, status: "PUBLISHED", deletedAt: null },
      orderBy: { versionNumber: "desc" },
    });
  }

  async create(data: CreateThemeVersionDto): Promise<ThemeVersion> {
    return prisma.$transaction(async (tx) => {
      const latest = await tx.themeVersion.findFirst({
        where: { projectId: data.projectId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      const nextNumber = (latest?.versionNumber ?? 0) + 1;

      return tx.themeVersion.create({
        data: {
          projectId: data.projectId,
          versionNumber: nextNumber,
          snapshot: data.snapshot,
          createdBy: data.createdBy,
          status: data.status ?? "DRAFT",
          shopifyThemeId: data.shopifyThemeId,
          restoredFromId: data.restoredFromId,
        },
      });
    });
  }

  async updateStatus(
    id: string,
    status: VersionStatus,
    extra?: { shopifyThemeId?: string; publishedAt?: Date },
  ): Promise<ThemeVersion> {
    return prisma.themeVersion.update({
      where: { id },
      data: {
        status,
        ...(extra?.shopifyThemeId ? { shopifyThemeId: extra.shopifyThemeId } : {}),
        ...(extra?.publishedAt ? { publishedAt: extra.publishedAt } : {}),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.themeVersion.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
