import { Injectable } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import type { PreviewSession } from "@prisma/client";
import { randomBytes } from "crypto";

export interface CreatePreviewSessionDto {
  projectId: string;
  shop: string;
  merchantId: string;
  ttlMinutes?: number;
  previewState?: object;
}

@Injectable()
export class PreviewSessionRepository {
  async create(data: CreatePreviewSessionDto): Promise<PreviewSession> {
    const ttl = data.ttlMinutes ?? 30;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
    const sessionToken = randomBytes(32).toString("hex");

    return prisma.previewSession.create({
      data: {
        projectId: data.projectId,
        shop: data.shop,
        merchantId: data.merchantId,
        sessionToken,
        expiresAt,
        previewState: data.previewState as object | undefined,
      },
    });
  }

  async findByToken(token: string): Promise<PreviewSession | null> {
    return prisma.previewSession.findFirst({
      where: {
        sessionToken: token,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findActiveByProject(projectId: string): Promise<PreviewSession | null> {
    return prisma.previewSession.findFirst({
      where: {
        projectId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updatePreviewState(id: string, state: object): Promise<PreviewSession> {
    return prisma.previewSession.update({
      where: { id },
      data: { previewState: state },
    });
  }

  async extend(id: string, additionalMinutes: number = 30): Promise<PreviewSession> {
    return prisma.previewSession.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + additionalMinutes * 60 * 1000) },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.previewSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async cleanupExpired(): Promise<number> {
    const result = await prisma.previewSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    return result.count;
  }
}
