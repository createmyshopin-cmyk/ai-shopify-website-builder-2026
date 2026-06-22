import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  ThemeVersionRepository,
  type VersionStatus,
  type CreateThemeVersionDto,
} from "./theme-version.repository.js";
import { AuditService } from "../event/audit.service.js";
import type { ThemeVersion } from "@prisma/client";

export interface VersionHistoryItem {
  id: string;
  versionNumber: number;
  status: string;
  shopifyThemeId: string | null;
  publishedAt: string | null;
  restoredFromId: string | null;
  createdBy: string;
  createdAt: string;
}

/**
 * ThemeVersionService
 *
 * Implements the version state machine:
 *   DRAFT → PUBLISHED → (replaced) → ROLLED_BACK
 *                ↑                         ↓
 *                └──────── RESTORE ────────┘
 *
 * Version numbers are auto-incremented per project via optimistic locking
 * inside a Prisma transaction (ThemeVersionRepository.create).
 */
@Injectable()
export class ThemeVersionService {
  private readonly logger = new Logger(ThemeVersionService.name);

  constructor(
    @Inject(ThemeVersionRepository) private readonly repo: ThemeVersionRepository,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createDraft(
    projectId: string,
    shop: string,
    snapshot: object,
  ): Promise<ThemeVersion> {
    await this.assertProjectOwnership(projectId, shop);

    const version = await this.repo.create({
      projectId,
      snapshot,
      createdBy: shop,
      status: "DRAFT",
    });

    await this.audit.record({
      projectId,
      step: "VERSION_DRAFT",
      message: `Draft v${version.versionNumber} created`,
      status: "INFO",
    });

    this.logger.log(`[ThemeVersion] Draft v${version.versionNumber} created for project ${projectId}`);
    return version;
  }

  async publishVersion(
    versionId: string,
    shop: string,
    shopifyThemeId: string,
  ): Promise<ThemeVersion> {
    const version = await this.repo.findById(versionId);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    await this.assertProjectOwnership(version.projectId, shop);

    if (version.status !== "DRAFT") {
      throw new BadRequestException(
        `Version ${versionId} is in status ${version.status} — only DRAFT can be published`,
      );
    }

    const published = await this.repo.updateStatus(versionId, "PUBLISHED", {
      shopifyThemeId,
      publishedAt: new Date(),
    });

    await this.audit.record({
      projectId: version.projectId,
      step: "VERSION_PUBLISHED",
      message: `v${version.versionNumber} published (Shopify theme: ${shopifyThemeId})`,
      status: "SUCCESS",
    });

    this.logger.log(
      `[ThemeVersion] v${version.versionNumber} published for project ${version.projectId}`,
    );
    return published;
  }

  async rollbackTo(versionId: string, shop: string): Promise<ThemeVersion> {
    const target = await this.repo.findById(versionId);
    if (!target) throw new NotFoundException(`Version ${versionId} not found`);

    await this.assertProjectOwnership(target.projectId, shop);

    if (target.deletedAt) {
      throw new BadRequestException(`Version ${versionId} has been deleted`);
    }

    // Create a new RESTORE version that is a copy of the target snapshot.
    // This preserves immutability of past versions.
    const restored = await this.repo.create({
      projectId: target.projectId,
      snapshot: target.snapshot as object,
      createdBy: shop,
      status: "RESTORE",
      shopifyThemeId: target.shopifyThemeId ?? undefined,
      restoredFromId: versionId,
    });

    await this.audit.record({
      projectId: target.projectId,
      step: "VERSION_ROLLBACK",
      message: `Rolled back to v${target.versionNumber} — new restore v${restored.versionNumber} created`,
      status: "INFO",
    });

    this.logger.log(
      `[ThemeVersion] Rollback to v${target.versionNumber} → restore v${restored.versionNumber}`,
    );
    return restored;
  }

  async getHistory(projectId: string, shop: string): Promise<VersionHistoryItem[]> {
    await this.assertProjectOwnership(projectId, shop);

    const versions = await this.repo.findByProject(projectId);
    return versions.map((v) => this.toHistoryItem(v));
  }

  async getVersion(versionId: string, shop: string): Promise<ThemeVersion> {
    const version = await this.repo.findById(versionId);
    if (!version || version.deletedAt) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }
    await this.assertProjectOwnership(version.projectId, shop);
    return version;
  }

  async softDelete(versionId: string, shop: string): Promise<void> {
    const version = await this.repo.findById(versionId);
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    await this.assertProjectOwnership(version.projectId, shop);

    if (version.status === "PUBLISHED") {
      throw new BadRequestException("Cannot delete a published version");
    }

    await this.repo.softDelete(versionId);

    await this.audit.record({
      projectId: version.projectId,
      step: "VERSION_DELETED",
      message: `v${version.versionNumber} soft-deleted`,
      status: "INFO",
    });
  }

  private async assertProjectOwnership(projectId: string, shop: string): Promise<void> {
    const project = await prisma.designProject.findFirst({
      where: { id: projectId, shop, deletedAt: null },
    });
    if (!project) {
      throw new ForbiddenException(
        `Project ${projectId} not found or does not belong to shop ${shop}`,
      );
    }
  }

  private toHistoryItem(v: ThemeVersion): VersionHistoryItem {
    return {
      id: v.id,
      versionNumber: v.versionNumber,
      status: v.status,
      shopifyThemeId: v.shopifyThemeId ?? null,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      restoredFromId: v.restoredFromId ?? null,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
    };
  }
}
