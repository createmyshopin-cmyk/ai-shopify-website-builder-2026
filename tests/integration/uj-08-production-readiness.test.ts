import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";
import { rateLimitMiddleware } from "../../packages/api/src/common/rate-limit.middleware.js";
import { requestLoggingMiddleware } from "../../packages/api/src/common/request-logging.middleware.js";

describe("UJ-08 production readiness", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(requestLoggingMiddleware);
    app.use(rateLimitMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health reports phase 10 metadata", async () => {
    const response = await request(app.getHttpServer()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.phase).toBe(10);
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(response.body.nodeVersion).toMatch(/^v\d+/);
  });

  it("rate limit headers present on project routes", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({ stylePreset: "invalid" });

    expect(response.headers["x-ratelimit-limit"]).toBeDefined();
    expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
  });

  it("returns 429 when rate limit exceeded", async () => {
    const previous = process.env.API_RATE_LIMIT_MAX;
    process.env.API_RATE_LIMIT_MAX = "2";

    const server = app.getHttpServer();
    const ip = `limit-${Date.now()}`;
    await request(server)
      .post("/api/projects/initiate")
      .set("X-Forwarded-For", ip)
      .send({ stylePreset: "invalid" });
    await request(server)
      .post("/api/projects/initiate")
      .set("X-Forwarded-For", ip)
      .send({ stylePreset: "invalid" });
    const blocked = await request(server)
      .post("/api/projects/initiate")
      .set("X-Forwarded-For", ip)
      .send({ stylePreset: "invalid" });

    if (previous === undefined) {
      delete process.env.API_RATE_LIMIT_MAX;
    } else {
      process.env.API_RATE_LIMIT_MAX = previous;
    }

    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/rate limit/i);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("UJ-08 full regression smoke", () => {
  let app: INestApplication;
  let projectId: string;

  beforeAll(async () => {
    process.env.MOCK_AI = "true";
    process.env.USE_BULLMQ = "false";
    process.env.DISABLE_SUPABASE_BROADCAST = "true";
    process.env.SKIP_PROJECT_EVENTS = "true";
    process.env.MOCK_SHOPIFY_UPLOAD = "true";
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

  it("UJ-01 initiate → run pipeline completes", async () => {
    const shop = `uj08-${Date.now()}.myshopify.com`;
    const init = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({
        productIds: ["gid://shopify/Product/1"],
        stylePreset: "high-converting",
        shop,
      });

    expect(init.status).toBe(202);
    projectId = init.body.projectId;

    const run = await request(app.getHttpServer())
      .post(`/api/projects/run/${projectId}`)
      .set("x-shop-domain", shop)
      .send({ shop });

    expect(run.status).toBe(200);
    expect(run.body.status).toBe("AGENTS_COMPLETE");
  });

  it("UJ-05 chat refinement works after pipeline", async () => {
    const shop = `uj08-chat-${Date.now()}.myshopify.com`;
    const init = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({
        productIds: ["gid://shopify/Product/1"],
        stylePreset: "high-converting",
        shop,
      });
    expect(init.status).toBe(202);
    const id = init.body.projectId;
    const run = await request(app.getHttpServer())
      .post(`/api/projects/run/${id}`)
      .set("x-shop-domain", shop)
      .send({ shop });
    expect(run.status).toBe(200);

    const chat = await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", shop)
      .send({ projectId: id, message: "Change colors to black" });

    expect(chat.status).toBe(200);
    expect(chat.body.patchesApplied.length).toBeGreaterThan(0);
  });
});
