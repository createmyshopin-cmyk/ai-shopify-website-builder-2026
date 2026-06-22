import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("UJ-05 AI chat refinement journey", () => {
  let app: INestApplication;
  const shop = `uj05-vitest-${Date.now()}.myshopify.com`;
  let projectId: string;

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

  it("rejects liquid injection in chat", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", shop)
      .send({
        projectId,
        message: "{{ product.title }}",
      });

    expect(response.status).toBe(400);
  });

  it("applies color change via chat and updates preview state", async () => {
    const started = Date.now();
    const response = await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", shop)
      .send({
        projectId,
        message: "Change colors to black",
      });

    expect(response.status).toBe(200);
    expect(response.body.reply).toBeTruthy();
    expect(response.body.patchesApplied.length).toBeGreaterThan(0);
    expect(response.body.state.settingsPatch.color_primary).toBe("#000000");
    expect(response.body.history.length).toBeGreaterThanOrEqual(2);
    expect(Date.now() - started).toBeLessThan(30_000);
  });

  it("adds FAQ section via chat", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", shop)
      .send({
        projectId,
        message: "Add FAQ section",
      });

    expect(response.status).toBe(200);
    expect(
      response.body.state.sections.some(
        (section: { type: string }) => section.type === "faq-v2",
      ),
    ).toBe(true);
  });
});
