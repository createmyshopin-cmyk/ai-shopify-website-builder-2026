import { Injectable } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import type { GeneratedAsset } from "@prisma/client";

export interface CreateAssetDto {
  projectId: string;
  originalUrl?: string;
  generatedUrl?: string;
  shopifyFileId?: string;
  cdnUrl?: string;
  sectionType?: string;
  slotKey?: string;
  mimeType?: string;
}

@Injectable()
export class AssetRepository {
  async findByProject(
    projectId: string,
    opts?: { sectionType?: string },
  ): Promise<GeneratedAsset[]> {
    return prisma.generatedAsset.findMany({
      where: {
        projectId,
        ...(opts?.sectionType ? { sectionType: opts.sectionType } : {}),
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<GeneratedAsset | null> {
    return prisma.generatedAsset.findUnique({ where: { id } });
  }

  async create(data: CreateAssetDto): Promise<GeneratedAsset> {
    return prisma.generatedAsset.create({ data });
  }

  async update(
    id: string,
    data: Partial<CreateAssetDto>,
  ): Promise<GeneratedAsset> {
    return prisma.generatedAsset.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.generatedAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteByProject(projectId: string): Promise<void> {
    await prisma.generatedAsset.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
