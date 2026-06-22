import { Logger } from "@nestjs/common";
import { Worker, type Job } from "bullmq";
import { prisma } from "@theme-editor/db";
import { AgentOutputsSchema } from "@theme-editor/shared";
import { QUEUE_NAMES, redisConnection } from "../queue/queues.config.js";
import { ShopifyPublishClient } from "./shopify-publish.client.js";
import { PublishLockService } from "./publish-lock.service.js";

const logger = new Logger("PublishWorker");

export interface PublishJobData {
  projectId: string;
  shop: string;
  merchantId: string;
  jobDbId: string;
  versionId?: string;
}

export interface RollbackJobData {
  projectId: string;
  shop: string;
  merchantId: string;
  jobDbId: string;
  versionId: string;
}

/**
 * startPublishWorker
 *
 * BullMQ worker for the theme-publishing queue.
 * Handles both publish (job.name = 'publish') and rollback (job.name = 'rollback').
 *
 * Publish flow:
 *   1. Load compiler output from DesignProject.agentOutputs
 *   2. Build file payload (templates/index.json + config/settings_data.json)
 *   3. Upload to Shopify via ShopifyPublishClient
 *   4. Publish theme via themePublish mutation
 *   5. Record PublishedTheme + ThemeVersion in DB transaction
 *   6. Release distributed lock
 *
 * Rollback flow:
 *   1. Load target ThemeVersion and its shopifyThemeId
 *   2. Re-publish that theme via ShopifyPublishClient
 *   3. Update PublishedTheme records (mark old as ROLLED_BACK, insert new ACTIVE)
 *   4. Release distributed lock
 *
 * On failure: record PUBLISH_FAILED / ROLLBACK_FAILED event, release lock.
 */
export function startPublishWorker(lockService: PublishLockService): Worker {
  const queueName = QUEUE_NAMES.THEME_PUBLISHING;

  const worker = new Worker<PublishJobData | RollbackJobData>(
    queueName,
    async (job: Job<PublishJobData | RollbackJobData>) => {
      const { projectId, shop, jobDbId } = job.data;

      logger.log(
        `[PublishWorker] Processing job ${job.id} (name: ${job.name}) for project ${projectId}`,
      );

      // Mark job PROCESSING in DB
      await prisma.projectJob
        .update({ where: { id: jobDbId }, data: { status: "PROCESSING" } })
        .catch(() => {});

      if (job.name === "rollback") {
        await handleRollback(job as Job<RollbackJobData>, lockService);
      } else {
        await handlePublish(job as Job<PublishJobData>, lockService);
      }
    },
    {
      connection: redisConnection(),
      concurrency: 2,
    },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const { projectId, shop, jobDbId } = job.data as PublishJobData;
    const isRollback = job.name === "rollback";
    const stepName = isRollback ? "ROLLBACK_FAILED" : "PUBLISH_FAILED";

    logger.error(
      `[PublishWorker] Job ${job.id} (${job.name}) failed: ${err.message}`,
    );

    await Promise.all([
      prisma.projectJob
        .update({
          where: { id: jobDbId },
          data: { status: "FAILED", errors: err.message },
        })
        .catch(() => {}),
      prisma.projectEvent
        .create({
          data: {
            projectId,
            step: stepName,
            message: `${isRollback ? "Rollback" : "Publish"} failed: ${err.message}`,
            status: "ERROR",
          },
        })
        .catch(() => {}),
    ]);

    await lockService.release(shop, jobDbId).catch(() => {});
  });

  return worker;
}

// ─── Publish handler ──────────────────────────────────────────────────────────

async function handlePublish(
  job: Job<PublishJobData>,
  lockService: PublishLockService,
): Promise<void> {
  const { projectId, shop, jobDbId } = job.data;

  const project = await prisma.designProject.findUnique({
    where: { id: projectId },
  });
  if (!project) throw new Error(`Project ${projectId} not found`);

  const outputs = AgentOutputsSchema.partial().parse(project.agentOutputs ?? {});
  if (!outputs.compiler) {
    throw new Error(`No compiler output found for project ${projectId}`);
  }

  const files = [
    {
      filename: "templates/index.json",
      content: JSON.stringify(outputs.compiler.indexJson, null, 2),
    },
    {
      filename: "config/settings_data.json",
      content: JSON.stringify({ current: outputs.compiler.settingsPatch }, null, 2),
    },
  ];

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (process.env.MOCK_SHOPIFY_UPLOAD === "true") {
    const mockThemeId = `mock-theme-${projectId}`;
    await prisma.$transaction([
      prisma.designProject.update({
        where: { id: projectId },
        data: { status: "PUBLISHED", publishedThemeId: mockThemeId },
      }),
      prisma.projectEvent.create({
        data: {
          projectId,
          step: "PUBLISH_COMPLETE",
          message: `Theme published (mock mode — theme: ${mockThemeId})`,
          status: "SUCCESS",
        },
      }),
      prisma.projectJob.update({
        where: { id: jobDbId },
        data: { status: "COMPLETE", result: { shopifyThemeId: mockThemeId } as object },
      }),
    ]);
    await lockService.release(shop, jobDbId);
    logger.log(`[PublishWorker] Mock publish complete for project ${projectId}`);
    return;
  }

  // ── Real Shopify path ────────────────────────────────────────────────────────
  const client = await ShopifyPublishClient.forShop(shop);
  if (!client) throw new Error(`Could not create Shopify client for shop ${shop}`);

  let themeId = project.draftThemeId;
  if (!themeId) {
    themeId = await client.provisionDraftTheme(projectId.substring(0, 8));
    await prisma.designProject.update({
      where: { id: projectId },
      data: { draftThemeId: themeId },
    });
  }

  await client.uploadFiles(themeId, files);
  const result = await client.publishTheme(themeId);

  const latestVersion = await prisma.themeVersion.findFirst({
    where: { projectId },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  await prisma.$transaction([
    prisma.themeVersion.create({
      data: {
        projectId,
        versionNumber: nextVersionNumber,
        snapshot: outputs as object,
        createdBy: shop,
        status: "PUBLISHED",
        shopifyThemeId: result.themeId,
        publishedAt: new Date(),
      },
    }),
    prisma.publishedTheme.updateMany({
      where: { projectId, status: "ACTIVE", deletedAt: null },
      data: { status: "REPLACED" },
    }),
    prisma.designProject.update({
      where: { id: projectId },
      data: { status: "PUBLISHED", publishedThemeId: result.themeId },
    }),
    prisma.projectEvent.create({
      data: {
        projectId,
        step: "PUBLISH_COMPLETE",
        message: `Theme published (Shopify ID: ${result.themeId})`,
        status: "SUCCESS",
      },
    }),
    prisma.projectJob.update({
      where: { id: jobDbId },
      data: { status: "COMPLETE", result: { shopifyThemeId: result.themeId } as object },
    }),
  ]);

  // Create PublishedTheme record — needs the versionId from the transaction above
  const newVersion = await prisma.themeVersion.findFirst({
    where: { projectId, status: "PUBLISHED", shopifyThemeId: result.themeId },
  });
  await prisma.publishedTheme.create({
    data: {
      projectId,
      shop,
      merchantId: shop,
      shopifyThemeId: result.themeId,
      versionId: newVersion?.id,
      status: "ACTIVE",
    },
  });

  await lockService.release(shop, jobDbId);
  logger.log(
    `[PublishWorker] Published theme ${result.themeId} for project ${projectId}`,
  );
}

// ─── Rollback handler ─────────────────────────────────────────────────────────

async function handleRollback(
  job: Job<RollbackJobData>,
  lockService: PublishLockService,
): Promise<void> {
  const { projectId, shop, jobDbId, versionId } = job.data;

  // Load target version to get its Shopify theme ID
  const targetVersion = await prisma.themeVersion.findFirst({
    where: { id: versionId, projectId, deletedAt: null },
  });
  if (!targetVersion) {
    throw new Error(`Version ${versionId} not found for project ${projectId}`);
  }
  if (!targetVersion.shopifyThemeId) {
    throw new Error(`Version ${versionId} has no associated Shopify theme ID`);
  }

  // ── Mock mode ────────────────────────────────────────────────────────────────
  if (process.env.MOCK_SHOPIFY_UPLOAD === "true") {
    await prisma.$transaction([
      prisma.publishedTheme.updateMany({
        where: { projectId, status: "ACTIVE", deletedAt: null },
        data: { status: "ROLLED_BACK" },
      }),
      prisma.publishedTheme.create({
        data: {
          projectId,
          shop,
          merchantId: shop,
          shopifyThemeId: targetVersion.shopifyThemeId,
          versionId,
          status: "ACTIVE",
        },
      }),
      prisma.designProject.update({
        where: { id: projectId },
        data: { publishedThemeId: targetVersion.shopifyThemeId },
      }),
      prisma.projectEvent.create({
        data: {
          projectId,
          step: "ROLLBACK_COMPLETE",
          message: `Rolled back to version ${versionId} (mock mode)`,
          status: "SUCCESS",
        },
      }),
      prisma.projectJob.update({
        where: { id: jobDbId },
        data: {
          status: "COMPLETE",
          result: { restoredVersionId: versionId } as object,
        },
      }),
    ]);
    await lockService.release(shop, jobDbId);
    logger.log(
      `[PublishWorker] Mock rollback complete — restored version ${versionId} for project ${projectId}`,
    );
    return;
  }

  // ── Real Shopify path ────────────────────────────────────────────────────────
  const client = await ShopifyPublishClient.forShop(shop);
  if (!client) throw new Error(`Could not create Shopify client for shop ${shop}`);

  // Re-publish the target theme on Shopify (makes it the active theme)
  await client.publishTheme(targetVersion.shopifyThemeId);

  await prisma.$transaction([
    prisma.publishedTheme.updateMany({
      where: { projectId, status: "ACTIVE", deletedAt: null },
      data: { status: "ROLLED_BACK" },
    }),
    prisma.publishedTheme.create({
      data: {
        projectId,
        shop,
        merchantId: shop,
        shopifyThemeId: targetVersion.shopifyThemeId,
        versionId,
        status: "ACTIVE",
      },
    }),
    prisma.designProject.update({
      where: { id: projectId },
      data: { publishedThemeId: targetVersion.shopifyThemeId },
    }),
    prisma.projectEvent.create({
      data: {
        projectId,
        step: "ROLLBACK_COMPLETE",
        message: `Rolled back to version ${versionId} (Shopify ID: ${targetVersion.shopifyThemeId})`,
        status: "SUCCESS",
      },
    }),
    prisma.projectJob.update({
      where: { id: jobDbId },
      data: {
        status: "COMPLETE",
        result: {
          restoredVersionId: versionId,
          shopifyThemeId: targetVersion.shopifyThemeId,
        } as object,
      },
    }),
  ]);

  await lockService.release(shop, jobDbId);
  logger.log(
    `[PublishWorker] Rollback complete — restored theme ${targetVersion.shopifyThemeId} ` +
    `(version ${versionId}) for project ${projectId}`,
  );
}
