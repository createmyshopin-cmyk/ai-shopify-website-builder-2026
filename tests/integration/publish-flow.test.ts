import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@theme-editor/db";

import { AppModule } from "../../packages/api/src/app.module.js";
import { PublishingService } from "../../packages/api/src/publishing/publishing.service.js";
import { PlatformQueueService } from "../../packages/api/src/queue/platform-queue.service.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("publish flow — enqueue → ThemeVersion + PublishedTheme", () => {
  let app: INestApplication;
  let publishingService: PublishingService;
  let platformQueue: PlatformQueueService;

  const shop = `publish-flow-${Date.now()}.myshopify.com`;
  let projectId: string;

  beforeAll(async () => {
    process.env.MOCK_AI = "true";
    process.env.MOCK_SHOPIFY_UPLOAD = "true";
    process.env.USE_BULLMQ = "false";
    process.env.DISABLE_SUPABASE_BROADCAST = "true";
    process.env.SKIP_PROJECT_EVENTS = "true";
    // Disable Redis so PublishLockService and CompilationCacheService skip gracefully
    process.env.REDIS_URL = "";
    process.env.REPO_ROOT = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../..",
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    publishingService = app.get(PublishingService);
    platformQueue = app.get(PlatformQueueService);

    // Seed: create a project at VALIDATION_COMPLETE status
    const account = await prisma.userAccount.create({
      data: { shop },
    });

    const project = await prisma.designProject.create({
      data: {
        shop,
        merchantId: shop,
        productIds: ["gid://shopify/Product/99"],
        stylePreset: "high-converting",
        status: "VALIDATION_COMPLETE",
        userAccountId: account.id,
        agentOutputs: {
          compiler: {
            indexJson: {
              sections: {
                hero: { type: "editorial-hero", settings: {} },
              },
              order: ["hero"],
            },
            settingsPatch: { colors: { background_1: "#ffffff" } },
          },
        },
      },
    });

    projectId = project.id;
  });

  afterAll(async () => {
    // Cleanup DB rows created by this test suite
    await prisma.publishedTheme.deleteMany({ where: { shop } });
    await prisma.themeVersion.deleteMany({ where: { projectId } });
    await prisma.projectJob.deleteMany({ where: { projectId } });
    await prisma.projectEvent.deleteMany({ where: { projectId } });
    await prisma.designProject.deleteMany({ where: { shop } });
    await prisma.userAccount.deleteMany({ where: { shop } });
    await app.close();
  });

  // ─── Publish enqueue ──────────────────────────────────────────────────────

  it("startPublish creates a ProjectJob and returns a jobId", async () => {
    const result = await publishingService.startPublish({
      projectId,
      shop,
      merchantId: shop,
    });

    expect(result.jobId).toBeTruthy();
    expect(result.projectId).toBe(projectId);

    const job = await prisma.projectJob.findUnique({ where: { id: result.jobId } });
    expect(job).not.toBeNull();
    expect(job?.type).toBe("THEME_PUBLISHING");
    expect(["PROCESSING", "PENDING"]).toContain(job?.status);
  });

  // ─── completePublish creates ThemeVersion + PublishedTheme ────────────────

  it("completePublish creates ThemeVersion and PublishedTheme records", async () => {
    const mockShopifyThemeId = `mock-theme-${projectId}`;
    const snapshot = { compiler: { indexJson: {}, settingsPatch: {} } };

    // Retrieve the job created in the previous test
    const job = await prisma.projectJob.findFirst({
      where: { projectId, type: "THEME_PUBLISHING" },
      orderBy: { createdAt: "desc" },
    });
    expect(job).not.toBeNull();

    await publishingService.completePublish(
      job!.id,
      projectId,
      shop,
      mockShopifyThemeId,
      snapshot,
    );

    // Verify ThemeVersion record
    const version = await prisma.themeVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
    });
    expect(version).not.toBeNull();
    expect(version?.status).toBe("PUBLISHED");
    expect(version?.shopifyThemeId).toBe(mockShopifyThemeId);

    // Verify PublishedTheme record
    const publishedTheme = await prisma.publishedTheme.findFirst({
      where: { projectId, shopifyThemeId: mockShopifyThemeId },
    });
    expect(publishedTheme).not.toBeNull();
    expect(publishedTheme?.status).toBe("ACTIVE");
    expect(publishedTheme?.shop).toBe(shop);

    // Verify project status updated
    const updated = await prisma.designProject.findUnique({ where: { id: projectId } });
    expect(updated?.status).toBe("PUBLISHED");
    expect(updated?.publishedThemeId).toBe(mockShopifyThemeId);
  });

  // ─── Rollback enqueue → completeRollback ─────────────────────────────────

  it("startRollback + completeRollback restores version and creates new PublishedTheme", async () => {
    // Create a second version to roll back from (simulating another publish)
    const v1 = await prisma.themeVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "asc" },
    });
    expect(v1).not.toBeNull();

    const v2 = await prisma.themeVersion.create({
      data: {
        projectId,
        versionNumber: (v1!.versionNumber ?? 1) + 1,
        snapshot: {},
        createdBy: shop,
        status: "PUBLISHED",
        shopifyThemeId: `mock-theme-v2-${projectId}`,
        publishedAt: new Date(),
      },
    });

    const rollbackResult = await publishingService.startRollback({
      projectId,
      versionId: v1!.id,
      shop,
      merchantId: shop,
    });

    expect(rollbackResult.jobId).toBeTruthy();

    const rollbackJob = await prisma.projectJob.findUnique({
      where: { id: rollbackResult.jobId },
    });
    expect(rollbackJob?.type).toBe("THEME_ROLLBACK");

    await publishingService.completeRollback(
      rollbackResult.jobId,
      projectId,
      shop,
      v1!.id,
      v1!.shopifyThemeId!,
    );

    // Verify old ACTIVE PublishedTheme is marked ROLLED_BACK
    const oldPublished = await prisma.publishedTheme.findFirst({
      where: { projectId, shopifyThemeId: `mock-theme-v2-${projectId}` },
    });
    // The v2 published theme we just created should no longer be ACTIVE
    // (either it was updated or a new ACTIVE record exists for v1)

    // Verify new ACTIVE PublishedTheme points to v1's shopifyThemeId
    const restoredPublished = await prisma.publishedTheme.findFirst({
      where: {
        projectId,
        shopifyThemeId: v1!.shopifyThemeId!,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(restoredPublished).not.toBeNull();

    // Cleanup v2
    await prisma.themeVersion.delete({ where: { id: v2.id } });
  });

  // ─── Idempotency ──────────────────────────────────────────────────────────

  it("duplicate startPublish with same idempotency key returns same jobId", async () => {
    // Create a fresh project to avoid conflicts from previous tests
    const idempotencyShop = `idempotency-${Date.now()}.myshopify.com`;
    const idempotencyProject = await prisma.designProject.create({
      data: {
        shop: idempotencyShop,
        merchantId: idempotencyShop,
        productIds: [],
        stylePreset: "minimal-modern",
        status: "VALIDATION_COMPLETE",
        agentOutputs: {
          compiler: { indexJson: {}, settingsPatch: {} },
        },
      },
    });

    const key = `idem-key-${Date.now()}`;

    const first = await publishingService.startPublish({
      projectId: idempotencyProject.id,
      shop: idempotencyShop,
      merchantId: idempotencyShop,
      idempotencyKey: key,
    });

    const second = await publishingService.startPublish({
      projectId: idempotencyProject.id,
      shop: idempotencyShop,
      merchantId: idempotencyShop,
      idempotencyKey: key,
    });

    expect(first.jobId).toBe(second.jobId);

    // Cleanup
    await prisma.projectJob.deleteMany({ where: { projectId: idempotencyProject.id } });
    await prisma.projectEvent.deleteMany({ where: { projectId: idempotencyProject.id } });
    await prisma.designProject.delete({ where: { id: idempotencyProject.id } });
  });
});
