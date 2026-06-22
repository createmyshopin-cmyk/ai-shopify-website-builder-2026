import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("UJ-06 approve and apply journey", () => {
  let app: INestApplication;
  const shop = `uj06-vitest-${Date.now()}.myshopify.com`;
  let projectId: string;

  beforeAll(async () => {
    process.env.MOCK_AI = "true";
    process.env.MOCK_SHOPIFY_UPLOAD = "true";
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

    const initiate = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({
        productIds: ["gid://shopify/Product/1"],
        stylePreset: "high-converting",
        shop,
      });

    projectId = initiate.body.projectId;

    await request(app.getHttpServer())
      .post(`/api/projects/run/${projectId}`)
      .set("x-shop-domain", shop)
      .send({ shop });
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects apply without explicit approval", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/apply")
      .set("x-shop-domain", shop)
      .send({ projectId, approved: false });

    expect(response.status).toBe(400);
  });

  it("creates backup and version on approved apply", async () => {
    const started = Date.now();
    const response = await request(app.getHttpServer())
      .post("/api/projects/apply")
      .set("x-shop-domain", shop)
      .send({ projectId, approved: true });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("APPLIED");
    expect(response.body.versionNumber).toBe(1);
    expect(response.body.backupId).toBeTruthy();
    expect(response.body.mode).toBe("mock");
    expect(Date.now() - started).toBeLessThan(30_000);

    const versions = await request(app.getHttpServer())
      .get(`/api/projects/versions/${projectId}`)
      .set("x-shop-domain", shop);

    expect(versions.status).toBe(200);
    expect(versions.body.versions.length).toBeGreaterThanOrEqual(1);
  });
});
