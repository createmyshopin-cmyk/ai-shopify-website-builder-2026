import { expect, test } from "@playwright/test";

const API = process.env.PROJECT_API_URL ?? "http://localhost:3001";

/**
 * UJ-03 — Product pick → pipeline → preview ready (API journey).
 * Full embedded UI flow requires `shopify app dev` + dev store tunnel.
 */
test.describe("UJ-03 Preview journey (API)", () => {
  test.skip(
    !process.env.DATABASE_URL || process.env.LIVE_E2E_API !== "true",
    "Set DATABASE_URL and LIVE_E2E_API=true with fresh API on PROJECT_API_URL",
  );

  test("initiate → run → list → preview ready with metadata", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const shop = `uj03-${Date.now()}.myshopify.com`;

    const health = await request.get(`${API}/health`);
    expect(health.ok()).toBeTruthy();

    const initiate = await request.post(`${API}/api/projects/initiate`, {
      data: {
        productIds: ["gid://shopify/Product/1"],
        stylePreset: "high-converting",
        shop,
      },
    });
    expect(initiate.status()).toBe(202);
    const initiateBody = await initiate.json();
    const projectId = initiateBody.projectId as string;
    expect(projectId).toBeTruthy();

    const run = await request.post(`${API}/api/projects/run/${projectId}`, {
      headers: { "x-shop-domain": shop },
      data: { shop },
    });
    expect(run.ok()).toBeTruthy();
    const runBody = await run.json();
    expect(runBody.status).toBe("AGENTS_COMPLETE");
    expect(runBody.validationPassed).toBe(true);

    const list = await request.get(`${API}/api/projects`, {
      headers: { "x-shop-domain": shop },
    });
    expect(list.ok()).toBeTruthy();
    const listBody = await list.json();
    expect(
      listBody.projects.some(
        (project: { projectId: string; ready: boolean }) =>
          project.projectId === projectId && project.ready,
      ),
    ).toBe(true);

    const preview = await request.get(
      `${API}/api/projects/preview/${projectId}`,
      { headers: { "x-shop-domain": shop } },
    );
    expect(preview.ok()).toBeTruthy();
    const previewBody = await preview.json();
    expect(previewBody.ready).toBe(true);
    expect(previewBody.previewMode).toBe("mock");
    expect(previewBody.metadata?.validationPassed).toBe(true);
    expect(previewBody.metadata?.headline).toBeTruthy();
  });
});
