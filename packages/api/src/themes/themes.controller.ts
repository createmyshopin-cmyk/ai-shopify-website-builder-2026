import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request as ExpressRequest } from "express";

import { ShopifyJwtGuard } from "../common/guards/shopify-jwt.guard.js";
import { MerchantOwnershipGuard } from "../common/guards/merchant-ownership.guard.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { ThemeGenerationService } from "../theme-generation/theme-generation.service.js";
import { PreviewService } from "../preview/preview.service.js";
import { PublishingService } from "../publishing/publishing.service.js";
import { ThemeVersionService } from "../theme-version/theme-version.service.js";
import { JobService } from "../job/job.service.js";
import { GenerateThemeDto } from "./dto/generate-theme.dto.js";
import { PreviewThemeDto } from "./dto/preview-theme.dto.js";
import { PublishThemeDto } from "./dto/publish-theme.dto.js";
import { RollbackThemeDto } from "./dto/rollback-theme.dto.js";
import { prisma } from "@theme-editor/db";

type AuthRequest = ExpressRequest & { shop?: string; merchantId?: string };

/**
 * ThemesController
 *
 * Platform Layer API — all mutation endpoints return 202 Accepted with { jobId }.
 * Existing /api/projects/* endpoints are untouched (backward compatibility).
 *
 * Authentication: ShopifyJwtGuard validates session token on every request.
 * Ownership:      MerchantOwnershipGuard enforces project → shop scoping.
 * Idempotency:    IdempotencyInterceptor extracts X-Idempotency-Key header.
 */
@Controller("themes")
@UseGuards(ShopifyJwtGuard)
@UseInterceptors(IdempotencyInterceptor)
export class ThemesController {
  constructor(
    @Inject(ThemeGenerationService) private readonly generationService: ThemeGenerationService,
    @Inject(PreviewService) private readonly previewService: PreviewService,
    @Inject(PublishingService) private readonly publishingService: PublishingService,
    @Inject(ThemeVersionService) private readonly versionService: ThemeVersionService,
    @Inject(JobService) private readonly jobService: JobService,
  ) {}

  /**
   * POST /themes/generate
   * Initiates theme generation pipeline for the given products + preset.
   * Creates a new DesignProject and enqueues the agent pipeline.
   * Returns 202 Accepted with { jobId }.
   */
  @Post("generate")
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Body() dto: GenerateThemeDto,
    @Request() req: AuthRequest,
  ): Promise<{ jobId: string; projectId: string }> {
    const shop = req.shop ?? "";
    const merchantId = req.merchantId ?? shop;

    // Create project first via Prisma (mirrors existing ProjectsService.initiate)
    const account = await prisma.userAccount.upsert({
      where: { shop },
      create: { shop },
      update: {},
    });

    const project = await prisma.designProject.create({
      data: {
        shop,
        merchantId,
        productIds: dto.productIds,
        stylePreset: dto.stylePreset,
        status: "PENDING",
        userAccountId: account.id,
      },
    });

    const result = await this.generationService.startGeneration({
      projectId: project.id,
      shop,
      merchantId,
      idempotencyKey: dto.idempotencyKey,
    });

    return { jobId: result.jobId, projectId: result.projectId };
  }

  /**
   * POST /themes/preview
   * Creates a preview session for the specified project.
   * Returns 202 Accepted with { jobId, sessionToken, expiresAt }.
   */
  @Post("preview")
  @UseGuards(MerchantOwnershipGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async preview(
    @Body() dto: PreviewThemeDto,
    @Request() req: AuthRequest,
  ): Promise<{ jobId: string; sessionToken: string; expiresAt: string }> {
    const shop = req.shop ?? "";
    const merchantId = req.merchantId ?? shop;

    const result = await this.previewService.startPreview({
      projectId: dto.projectId,
      shop,
      merchantId,
      idempotencyKey: dto.idempotencyKey,
      previewState: dto.previewState,
    });

    return result;
  }

  /**
   * POST /themes/publish
   * Initiates theme publishing to Shopify with distributed locking.
   * Returns 202 Accepted with { jobId }.
   */
  @Post("publish")
  @UseGuards(MerchantOwnershipGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async publish(
    @Body() dto: PublishThemeDto,
    @Request() req: AuthRequest,
  ): Promise<{ jobId: string }> {
    const shop = req.shop ?? "";
    const merchantId = req.merchantId ?? shop;

    const result = await this.publishingService.startPublish({
      projectId: dto.projectId,
      shop,
      merchantId,
      idempotencyKey: dto.idempotencyKey,
      versionId: dto.versionId,
    });

    return { jobId: result.jobId };
  }

  /**
   * POST /themes/rollback
   * Rolls back to a specific theme version.
   * Returns 202 Accepted with { jobId }.
   */
  @Post("rollback")
  @UseGuards(MerchantOwnershipGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async rollback(
    @Body() dto: RollbackThemeDto,
    @Request() req: AuthRequest,
  ): Promise<{ jobId: string }> {
    const shop = req.shop ?? "";
    const merchantId = req.merchantId ?? shop;

    const result = await this.publishingService.startRollback({
      projectId: dto.projectId,
      versionId: dto.versionId,
      shop,
      merchantId,
      idempotencyKey: dto.idempotencyKey,
    });

    return { jobId: result.jobId };
  }

  /**
   * GET /themes/:id
   * Returns current status of a theme project.
   */
  @Get(":id")
  async getTheme(
    @Param("id") id: string,
    @Request() req: AuthRequest,
  ): Promise<{
    projectId: string;
    status: string;
    jobs: Array<{ type: string; status: string }>;
  }> {
    const shop = req.shop ?? "";
    return this.generationService.getProjectStatus(id, shop);
  }

  /**
   * GET /themes/:id/versions
   * Returns version history for a theme project.
   */
  @Get(":id/versions")
  async getVersions(
    @Param("id") id: string,
    @Request() req: AuthRequest,
  ): Promise<{ versions: unknown[] }> {
    const shop = req.shop ?? "";
    const versions = await this.versionService.getHistory(id, shop);
    return { versions };
  }

  /**
   * GET /themes/:id/jobs/:jobId
   * Returns status of a specific job for a project.
   */
  @Get(":id/jobs/:jobId")
  async getJob(
    @Param("id") id: string,
    @Param("jobId") jobId: string,
    @Request() req: AuthRequest,
  ): Promise<unknown> {
    const shop = req.shop ?? "";
    // Verify project ownership
    const project = await prisma.designProject.findFirst({
      where: { id, shop, deletedAt: null },
      select: { id: true },
    });
    if (!project) {
      return { error: "Project not found or access denied" };
    }
    return this.jobService.getJobStatus(jobId, id);
  }
}
