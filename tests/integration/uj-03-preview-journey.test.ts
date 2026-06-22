import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

/**
 * UJ-03 — Select products → style → pipeline → preview ready.
 * API-level journey (embedded UI covered manually / LIVE_E2E_API Playwright).
 */
describe.skipIf(!hasDatabase)("UJ-03 preview journey", () => {
  let app: INestApplication;
  const shop = `uj03-vitest-${Date.now()}.myshopify.com`;

  beforeAll(async () => {
    process.env.MOCK_AI = "true";
    process.env.USE_BULLMQ = "false";
    process.env.DISABLE_SUPABASE_BROADCAST = "true";
    process.env.SKIP_PROJECT_EVENTS = "true";
    process.env.REPO_ROOT = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../..",
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("initiate → run → list → preview ready with metadata", async () => {
    const initiate = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({
        productIds: ["gid://shopify/Product/1"],
        stylePreset: "high-converting",
        shop,
      });

    expect(initiate.status).toBe(202);
    const projectId = initiate.body.projectId as string;

    const run = await request(app.getHttpServer())
      .post(`/api/projects/run/${projectId}`)
      .set("x-shop-domain", shop)
      .send({ shop });

    expect(run.status).toBe(200);
    expect(run.body.status).toBe("AGENTS_COMPLETE");
    expect(run.body.validationPassed).toBe(true);

    const list = await request(app.getHttpServer())
      .get("/api/projects")
      .set("x-shop-domain", shop);

    expect(list.status).toBe(200);
    expect(
      list.body.projects.some(
        (project: { projectId: string; ready: boolean }) =>
          project.projectId === projectId && project.ready,
      ),
    ).toBe(true);

    const preview = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", shop);

    expect(preview.status).toBe(200);
    expect(preview.body.ready).toBe(true);
    expect(preview.body.previewMode).toBe("mock");
    expect(preview.body.metadata?.validationPassed).toBe(true);
    expect(preview.body.metadata?.headline).toBeTruthy();
  });
});
