import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("API integration", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const response = await request(app.getHttpServer()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.phase).toBe(10);
  });

  it("POST /api/projects/initiate rejects invalid body", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({ stylePreset: "invalid" });

    expect(response.status).toBe(400);
  });
});

describe.skipIf(!hasDatabase)("API integration with database", () => {
  let app: INestApplication;
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
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/projects/initiate returns 202 with projectId", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/initiate")
      .send({
        productIds: ["gid://shopify/Product/1"],
        stylePreset: "high-converting",
        shop: "test.myshopify.com",
      });

    expect(response.status).toBe(202);
    expect(response.body.projectId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.body.pipelineMode).toBeUndefined();
    expect(response.body.status).toBe("BLUEPRINT_READY");
    expect(response.body.blueprintSectionCount).toBeGreaterThan(0);
    projectId = response.body.projectId;
  });

  it("GET /api/projects/status/:id returns job list after sync pipeline", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/status/${projectId}`)
      .set("x-shop-domain", "test.myshopify.com");

    expect(response.status).toBe(200);
    expect(response.body.jobs).toHaveLength(7);
    expect(response.body.status).toBe("BLUEPRINT_READY");
  });

  it("GET /api/projects/status/:id returns 403 for wrong shop", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/status/${projectId}`)
      .set("x-shop-domain", "other.myshopify.com");

    expect(response.status).toBe(403);
  });

  it("POST /api/projects/run/:id completes or re-queues agent pipeline (Phase 3/4)", async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/projects/run/${projectId}`)
      .set("x-shop-domain", "test.myshopify.com")
      .send({ shop: "test.myshopify.com" });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("sync");
    expect(response.body.status).toBe("AGENTS_COMPLETE");
    expect(response.body.validationPassed).toBe(true);
    expect(response.body.jobs).toHaveLength(7);

    const vision = response.body.jobs.find(
      (j: { type: string }) => j.type === "VISION",
    );
    const upload = response.body.jobs.find(
      (j: { type: string }) => j.type === "UPLOAD",
    );
    const validation = response.body.jobs.find(
      (j: { type: string }) => j.type === "VALIDATION",
    );

    expect(vision?.status).toBe("COMPLETE");
    expect(upload?.status).toBe("COMPLETE");
    expect(validation?.status).toBe("COMPLETE");
  });

  it("GET /api/projects/events/:id returns progress audit trail (Phase 4)", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/events/${projectId}`)
      .set("x-shop-domain", "test.myshopify.com");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.events)).toBe(true);
  });

  it("GET /api/projects/preview/:id reflects validation complete", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", "test.myshopify.com");

    expect(response.status).toBe(200);
    expect(response.body.ready).toBe(true);
    expect(response.body.blueprintSectionCount).toBeGreaterThan(0);
    expect(response.body.previewMode).toBe("mock");
    expect(response.body.metadata?.validationPassed).toBe(true);
    expect(response.body.metadata?.sectionTypes?.length).toBeGreaterThan(0);
  });

  it("GET /api/projects lists shop projects (Phase 6)", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/projects")
      .set("x-shop-domain", "test.myshopify.com");

    expect(response.status).toBe(200);
    expect(response.body.shop).toBe("test.myshopify.com");
    expect(
      response.body.projects.some(
        (project: { projectId: string }) => project.projectId === projectId,
      ),
    ).toBe(true);
  });

  it("GET /api/projects/preview/:id/state returns editable state (Phase 7)", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}/state`)
      .set("x-shop-domain", "test.myshopify.com");

    expect(response.status).toBe(200);
    expect(response.body.editable).toBe(true);
    expect(response.body.state.sections.length).toBeGreaterThan(0);
  });

  it("PATCH /api/projects/preview/:id updates section heading (Phase 7)", async () => {
    const state = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}/state`)
      .set("x-shop-domain", "test.myshopify.com");

    const sectionId = state.body.state.order[0];

    const patch = await request(app.getHttpServer())
      .patch(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", "test.myshopify.com")
      .send({
        patch: {
          op: "updateSection",
          sectionId,
          settings: { heading: "Integration edit" },
        },
      });

    expect(patch.status).toBe(200);
    const updated = patch.body.state.sections.find(
      (section: { id: string }) => section.id === sectionId,
    );
    expect(updated?.settings?.heading).toBe("Integration edit");
  });

  it("POST /api/projects/chat applies preview-only refinement (Phase 8)", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", "test.myshopify.com")
      .send({
        projectId,
        message: "Change colors to black",
      });

    expect(response.status).toBe(200);
    expect(response.body.patchesApplied.length).toBeGreaterThan(0);
    expect(response.body.state.settingsPatch.color_primary).toBe("#000000");
  });

  it("POST /api/projects/chat rejects liquid injection (Phase 8)", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/chat")
      .set("x-shop-domain", "test.myshopify.com")
      .send({
        projectId,
        message: "{{ product.title }}",
      });

    expect(response.status).toBe(400);
  });

  it("POST /api/projects/apply with approval (Phase 9)", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/projects/apply")
      .set("x-shop-domain", "test.myshopify.com")
      .send({ projectId, approved: true });

    expect(response.status).toBe(200);
    expect(response.body.versionNumber).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/projects/versions lists snapshots (Phase 9)", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/versions/${projectId}`)
      .set("x-shop-domain", "test.myshopify.com");

    expect(response.status).toBe(200);
    expect(response.body.versions.length).toBeGreaterThanOrEqual(1);
  });
});
