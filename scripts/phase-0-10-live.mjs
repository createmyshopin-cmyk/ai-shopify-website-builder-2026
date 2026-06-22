/**
 * Live HTTP E2E for Phases 0–10 (requires API on PROJECT_API_URL).
 */
import "dotenv/config";

const API = process.env.PROJECT_API_URL ?? "http://localhost:3001";
const shop = `live-0-10-${Date.now()}.myshopify.com`;

const results = [];

function record(phase, check, pass, detail = "") {
  results.push({ phase, check, pass, detail });
  console.log(
    `[${pass ? "PASS" : "FAIL"}] Phase ${phase}: ${check}${detail ? ` — ${detail}` : ""}`,
  );
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const headers = Object.fromEntries(response.headers.entries());
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body, headers };
}

async function main() {
  console.log("\n=== Phase 0–10 Live E2E ===\n");
  console.log(`API: ${API}\n`);

  try {
    const health = await request("/health");
    record(
      "10",
      "API health phase 10",
      health.status === 200 &&
        health.body?.status === "ok" &&
        health.body?.phase === 10,
      `phase=${health.body?.phase}`,
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
    "10",
    "Rate limit headers on initiate",
    Boolean(initiate.headers["x-ratelimit-limit"]),
    initiate.headers["x-ratelimit-limit"] ?? "missing",
  );

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

    record(
      "7",
      "PATCH /preview edit",
      patch.status === 200 &&
        patch.body?.state?.sections?.some(
          (s) =>
            s.id === sectionId && s.settings?.heading === "Live E2E headline",
        ),
    );
  } else {
    record("7", "PATCH /preview edit", false, "no section id");
  }

  const chat = await request("/api/projects/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-domain": shop,
    },
    body: JSON.stringify({
      projectId,
      message: "Change colors to black",
    }),
  });

  record(
    "8",
    "POST /chat refinement",
    chat.status === 200 && (chat.body?.patchesApplied?.length ?? 0) > 0,
  );

  const apply = await request("/api/projects/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-domain": shop,
    },
    body: JSON.stringify({ projectId, approved: true }),
  });

  record(
    "9",
    "POST /apply with approval",
    apply.status === 200 && (apply.body?.versionNumber ?? 0) >= 1,
    `v${apply.body?.versionNumber}`,
  );

  const versions = await request(`/api/projects/versions/${projectId}`, {
    headers: { "x-shop-domain": shop },
  });

  record(
    "9",
    "GET /versions",
    versions.status === 200 && (versions.body?.versions?.length ?? 0) >= 1,
    `${versions.body?.versions?.length ?? 0} versions`,
  );

  if ((versions.body?.versions?.length ?? 0) >= 1) {
    const latest = versions.body.versions[0]?.versionNumber;
    const rollback = await request("/api/projects/rollback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shop-domain": shop,
      },
      body: JSON.stringify({
        projectId,
        versionNumber: latest,
      }),
    });

    record("9", "POST /rollback", rollback.status === 200, `v${latest}`);
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
  console.log("\nAll live Phase 0–10 checks passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
