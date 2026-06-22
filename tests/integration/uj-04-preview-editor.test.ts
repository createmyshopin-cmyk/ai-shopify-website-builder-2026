import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("UJ-04 preview editor journey", () => {
  let app: INestApplication;
  const shop = `uj04-vitest-${Date.now()}.myshopify.com`;
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

  it("loads editable preview state", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}/state`)
      .set("x-shop-domain", shop);

    expect(response.status).toBe(200);
    expect(response.body.editable).toBe(true);
    expect(response.body.state.order.length).toBeGreaterThan(0);
  });

  it("patches headline and reorders sections", async () => {
    const stateResponse = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}/state`)
      .set("x-shop-domain", shop);

    const state = stateResponse.body.state;
    const sectionId = state.order[0] as string;

    const patch = await request(app.getHttpServer())
      .patch(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", shop)
      .send({
        patch: {
          op: "updateSection",
          sectionId,
          settings: { heading: "UJ-04 Edited Headline" },
        },
      });

    expect(patch.status).toBe(200);
    const updated = patch.body.state.sections.find(
      (section: { id: string }) => section.id === sectionId,
    );
    expect(updated?.settings?.heading).toBe("UJ-04 Edited Headline");

    const reversed = [...state.order].reverse();
    const reorder = await request(app.getHttpServer())
      .patch(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", shop)
      .send({ patch: { op: "reorder", order: reversed } });

    expect(reorder.status).toBe(200);
    expect(reorder.body.state.order).toEqual(reversed);
  });

  it("toggles section visibility and adds blueprint section", async () => {
    const stateResponse = await request(app.getHttpServer())
      .get(`/api/projects/preview/${projectId}/state`)
      .set("x-shop-domain", shop);

    const sectionId = stateResponse.body.state.order[0] as string;
    const available = stateResponse.body.state
      .availableSectionTypes[0] as string;

    const toggle = await request(app.getHttpServer())
      .patch(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", shop)
      .send({
        patch: { op: "toggleSection", sectionId, enabled: false },
      });

    expect(toggle.status).toBe(200);
    const disabled = toggle.body.state.sections.find(
      (section: { id: string }) => section.id === sectionId,
    );
    expect(disabled?.enabled).toBe(false);

    const add = await request(app.getHttpServer())
      .patch(`/api/projects/preview/${projectId}`)
      .set("x-shop-domain", shop)
      .send({ patch: { op: "addSection", sectionType: available } });

    expect(add.status).toBe(200);
    expect(add.body.state.order.length).toBeGreaterThan(
      stateResponse.body.state.order.length,
    );
  });
});
