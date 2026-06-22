import { Injectable } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import type { PublishedTheme } from "@prisma/client";

export type PublishedThemeStatus = "ACTIVE" | "ROLLED_BACK" | "REPLACED";

export interface CreatePublishedThemeDto {
  projectId: string;
  shop: string;
  merchantId: string;
  shopifyThemeId: string;
  versionId?: string;
}

@Injectable()
export class PublishingRepository {
  async findActiveByProject(projectId: string): Promise<PublishedTheme | null> {
    return prisma.publishedTheme.findFirst({
      where: { projectId, status: "ACTIVE", deletedAt: null },
      orderBy: { publishedAt: "desc" },
    });
  }

  async findActiveByShop(shop: string): Promise<PublishedTheme | null> {
    return prisma.publishedTheme.findFirst({
      where: { shop, status: "ACTIVE", deletedAt: null },
      orderBy: { publishedAt: "desc" },
    });
  }

  async findByShopifyThemeId(shopifyThemeId: string): Promise<PublishedTheme | null> {
    return prisma.publishedTheme.findFirst({
      where: { shopifyThemeId, deletedAt: null },
    });
  }

  async create(data: CreatePublishedThemeDto): Promise<PublishedTheme> {
    return prisma.$transaction(async (tx) => {
      // Mark any existing ACTIVE themes for this project as REPLACED
      await tx.publishedTheme.updateMany({
        where: { projectId: data.projectId, status: "ACTIVE", deletedAt: null },
        data: { status: "REPLACED" },
      });

      return tx.publishedTheme.create({
        data: {
          projectId: data.projectId,
          shop: data.shop,
          merchantId: data.merchantId,
          shopifyThemeId: data.shopifyThemeId,
          versionId: data.versionId,
          status: "ACTIVE",
        },
      });
    });
  }

  async markRolledBack(id: string): Promise<PublishedTheme> {
    return prisma.publishedTheme.update({
      where: { id },
      data: { status: "ROLLED_BACK", rolledBackAt: new Date() },
    });
  }

  async getHistoryByProject(
    projectId: string,
    limit = 20,
  ): Promise<PublishedTheme[]> {
    return prisma.publishedTheme.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
  }
}
