import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("UJ-07 rollback journey", () => {
  let app: INestApplication;
  const shop = `uj07-vitest-${Date.now()}.myshopify.com`;
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

    await request(app.getHttpServer())
      .post("/api/projects/apply")
      .set("x-shop-domain", shop)
      .send({ projectId, approved: true });

    await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", shop)
      .send({ projectId, message: "Change colors to black" });

    await request(app.getHttpServer())
      .post("/api/projects/apply")
      .set("x-shop-domain", shop)
      .send({ projectId, approved: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it("rolls back to the previous version", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/rollback")
      .set("x-shop-domain", shop)
      .send({ projectId });

    expect(response.status).toBe(200);
    expect(response.body.restoredVersion).toBe(1);
    expect(response.body.message).toContain("version 1");
  });

  it("restores a specific version by number", async () => {
    const versions = await request(app.getHttpServer())
      .get(`/api/projects/versions/${projectId}`)
      .set("x-shop-domain", shop);

    const latest = versions.body.versions[0]?.versionNumber as number;

    const response = await request(app.getHttpServer())
      .post("/api/projects/rollback")
      .set("x-shop-domain", shop)
      .send({ projectId, versionNumber: latest });

    expect(response.status).toBe(200);
    expect(response.body.restoredVersion).toBe(latest);
  });
});
