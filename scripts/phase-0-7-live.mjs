/**
 * Live HTTP E2E for Phases 0–7 (requires API on PROJECT_API_URL).
 */
import "dotenv/config";

const API = process.env.PROJECT_API_URL ?? "http://localhost:3001";
const shop = `live-0-7-${Date.now()}.myshopify.com`;

const results = [];

function record(phase, check, pass, detail = "") {
  results.push({ phase, check, pass, detail });
  console.log(
    `[${pass ? "PASS" : "FAIL"}] Phase ${phase}: ${check}${detail ? ` — ${detail}` : ""}`,
  );
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
  console.log("\n=== Phase 0–7 Live E2E ===\n");
  console.log(`API: ${API}\n`);

  try {
    const health = await request("/health");
    record(
      "0",
      "API health",
      health.status === 200 && health.body?.status === "ok",
    );
  } catch (error) {
    record("0", "API health", false, String(error).slice(0, 80));
    console.error("\nStart API: npm run dev:api:stable\n");
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
  });

  record(
    "1+2",
    "POST /initiate",
    initiate.status === 202 && Boolean(initiate.body?.projectId),
    initiate.status === 202
      ? `${initiate.body?.blueprintSectionCount} sections`
      : `HTTP ${initiate.status}`,
  );

  const projectId = initiate.body?.projectId;
  if (!projectId) {
    summarize();
    return;
  }

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
    run.body?.status,
  );

  const preview = await request(`/api/projects/preview/${projectId}`, {
    headers: { "x-shop-domain": shop },
  });

  record(
    "6",
    "GET /preview ready",
    preview.status === 200 && preview.body?.ready === true,
  );

  const list = await request("/api/projects", {
    headers: { "x-shop-domain": shop },
  });

  record(
    "6",
    "GET /projects list",
    list.status === 200 &&
      list.body?.projects?.some((p) => p.projectId === projectId),
  );

  const state = await request(`/api/projects/preview/${projectId}/state`, {
    headers: { "x-shop-domain": shop },
  });

  record(
    "7",
    "GET /preview/state editable",
    state.status === 200 && state.body?.editable === true,
    `${state.body?.state?.order?.length ?? 0} sections`,
  );

  const sectionId = state.body?.state?.order?.[0];
  if (sectionId) {
    const patchStarted = Date.now();
    const patch = await request(`/api/projects/preview/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-shop-domain": shop,
      },
      body: JSON.stringify({
        patch: {
          op: "updateSection",
          sectionId,
          settings: { heading: "Live E2E headline" },
        },
      }),
    });
    const patchMs = Date.now() - patchStarted;

    record(
      "7",
      "PATCH /preview edit",
      patch.status === 200 &&
        patch.body?.state?.sections?.some(
          (s) =>
            s.id === sectionId && s.settings?.heading === "Live E2E headline",
        ),
      `${patchMs}ms`,
    );

    record(
      "7",
      "PATCH latency under 10s (pooler)",
      patchMs < 10_000,
      `${patchMs}ms`,
    );
  } else {
    record("7", "PATCH /preview edit", false, "no section id");
  }

  summarize();
}

function summarize() {
  const failed = results.filter((r) => !r.pass);
  console.log("\n=== Summary ===");
  console.log(
    `Total: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}`,
  );
  if (failed.length > 0) {
    console.log("\nFailed:");
    for (const f of failed) {
      console.log(`  - Phase ${f.phase}: ${f.check}${f.detail ? ` (${f.detail})` : ""}`);
    }
    process.exit(1);
  }
  console.log("\nAll live Phase 0–7 checks passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
