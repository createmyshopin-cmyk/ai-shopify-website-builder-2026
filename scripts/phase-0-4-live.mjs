/**
 * Live E2E smoke for Phases 0–4 (requires API on PROJECT_API_URL).
 */
import "dotenv/config";

const API = process.env.PROJECT_API_URL ?? "http://localhost:3001";
const shop = `e2e-${Date.now()}.myshopify.com`;

const results = [];

function record(phase, check, pass, detail = "") {
  results.push({ phase, check, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] Phase ${phase}: ${check}${detail ? ` — ${detail}` : ""}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function main() {
  console.log("\n=== Phase 0–4 Live E2E ===\n");
  console.log(`API: ${API}\n`);

  try {
    const health = await request("/health");
    record("0", "API health", health.status === 200 && health.body?.status === "ok");
  } catch (error) {
    record("0", "API health", false, String(error).slice(0, 80));
    console.error("\nStart API: npm run dev:api\n");
    process.exit(1);
  }

  const initiate = await request("/api/projects/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productIds: ["gid://shopify/Product/1"],
      stylePreset: "high-converting",
      shop,
    }),
  }).catch((error) => ({ status: 0, body: { message: String(error) } }));

  record(
    "1+2",
    "POST /initiate",
    initiate.status === 202 && Boolean(initiate.body?.projectId),
    initiate.status === 202
      ? `${initiate.body?.blueprintSectionCount} sections`
      : `HTTP ${initiate.status} ${initiate.body?.message ?? ""}`.slice(0, 120),
  );

  const projectId = initiate.body?.projectId;
  if (!projectId) {
    fail();
  }

  record(
    "2",
    "Blueprint ready",
    initiate.body?.status === "BLUEPRINT_READY",
    initiate.body?.status,
  );

  const run = await request(`/api/projects/run/${projectId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-domain": shop,
    },
    body: JSON.stringify({ shop }),
  });

  record(
    "3+4",
    "POST /run pipeline",
    run.status === 200 && run.body?.status === "AGENTS_COMPLETE",
    run.body?.mode ?? run.body?.status,
  );

  record(
    "3",
    "Validation passed",
    run.body?.validationPassed === true,
  );

  const status = await request(`/api/projects/status/${projectId}`, {
    headers: { "x-shop-domain": shop },
  });

  record(
    "1",
    "GET /status tenant isolation",
    status.status === 200 && status.body?.jobs?.length === 7,
  );

  const wrongShop = await request(`/api/projects/status/${projectId}`, {
    headers: { "x-shop-domain": "other.myshopify.com" },
  });

  record("1", "GET /status wrong shop → 403", wrongShop.status === 403);

  const events = await request(`/api/projects/events/${projectId}`, {
    headers: { "x-shop-domain": shop },
  });

  record(
    "4",
    "GET /events",
    events.status === 200 && Array.isArray(events.body?.events),
    `${events.body?.events?.length ?? 0} events`,
  );

  const preview = await request(`/api/projects/preview/${projectId}`, {
    headers: { "x-shop-domain": shop },
  });

  record(
    "3+6",
    "GET /preview ready",
    preview.status === 200 && preview.body?.ready === true,
  );

  record(
    "6",
    "GET /preview metadata",
    preview.body?.metadata?.validationPassed === true &&
      preview.body?.previewMode === "mock",
  );

  const list = await request("/api/projects", {
    headers: { "x-shop-domain": shop },
  });

  record(
    "6",
    "GET /projects list",
    list.status === 200 &&
      list.body?.projects?.some((project) => project.projectId === projectId),
  );

  record(
    "4",
    "latestProgress on status",
    Boolean(status.body?.latestProgress?.message) ||
      (events.body?.events?.length ?? 0) > 0,
  );

  fail();
}

function fail() {
  const failed = results.filter((r) => !r.pass);
  console.log("\n=== Summary ===");
  console.log(
    `Total: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}`,
  );
  if (failed.length > 0) {
    console.log("\nFailed:");
    for (const f of failed) {
      console.log(`  - Phase ${f.phase}: ${f.check}`);
    }
    process.exit(1);
  }
  console.log("\nAll live Phase 0–4 checks passed.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
