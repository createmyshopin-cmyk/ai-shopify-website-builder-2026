import "reflect-metadata";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../packages/api/src/app.module.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const concurrency = Number(process.env.PHASE_10_CONCURRENCY ?? 3);
const p95BudgetMs = Number(process.env.PHASE_10_P95_MS ?? 600_000);

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p)),
  );
  return sorted[index] ?? 0;
}

describe.skipIf(!hasDatabase)("phase-10 concurrent pipeline load", () => {
  let app: INestApplication;

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
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it(`completes ${concurrency} concurrent pipelines with p95 under ${p95BudgetMs}ms`, async () => {
    const batchStart = Date.now();
    const durations = await Promise.all(
      Array.from({ length: concurrency }, async (_, index) => {
        const shop = `load-${batchStart}-${index}.myshopify.com`;
        const started = performance.now();

        const init = await request(app.getHttpServer())
          .post("/api/projects/initiate")
          .send({
            productIds: ["gid://shopify/Product/1"],
            stylePreset: "high-converting",
            shop,
          });

        expect(init.status).toBe(202);

        const run = await request(app.getHttpServer())
          .post(`/api/projects/run/${init.body.projectId}`)
          .set("x-shop-domain", shop)
          .send({ shop });

        expect(run.status).toBe(200);
        expect(run.body.status).toBe("AGENTS_COMPLETE");

        return performance.now() - started;
      }),
    );

    const p95 = percentile(durations, 0.95);
    const wallMs = Date.now() - batchStart;

    expect(p95).toBeLessThan(p95BudgetMs);
    expect(wallMs).toBeLessThan(p95BudgetMs);
  }, 600_000);
});
