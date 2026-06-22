/**
 * Cross-phase smoke test (Phases 0–10).
 * Run: npm run test:cross-phase
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "@theme-editor/db";
import {
  STYLE_PRESETS,
  ThemeBlueprintSchema,
  buildBlueprintFromLocalTheme,
  GOLDEN_AGENT_OUTPUTS,
  AgentOutputsSchema,
  compileTheme,
  runSafetyPipeline,
  buildStorefrontPreviewUrl,
  applyPreviewPatch,
  buildPreviewStateFromOutputs,
  parseChatIntentMock,
  sanitizeChatMessage,
  ADVERSARIAL_CHAT_PROMPTS,
  compilerToThemeFiles,
  buildSnapshotFromCompiler,
} from "@theme-editor/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const results = [];

function record(phase, check, pass, detail) {
  results.push({ phase, check, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] Phase ${phase}: ${check}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n=== Cross-Phase Smoke Test (0–10) ===\n");

  // Phase 0
  record(
    "0",
    "Monorepo workspaces",
    existsSync(path.join(repoRoot, "mvp")) &&
      existsSync(path.join(repoRoot, "packages", "api")),
  );
  record(
    "0",
    "Style presets (3)",
    STYLE_PRESETS.length === 3,
    STYLE_PRESETS.map((p) => p.id).join(", "),
  );
  record("0", "docker-compose.yml", existsSync(path.join(repoRoot, "docker-compose.yml")));
  record("0", "QA docs", existsSync(path.join(repoRoot, "docs", "qa", "prd-progress.md")));

  // Phase 1 — DB connectivity
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    record("1", "Database connection", false, String(e).slice(0, 120));
  }
  if (dbOk) {
    record("1", "Database connection", true);
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const names = new Set(tables.map((t) => t.tablename));
    const required = [
      "Session",
      "UserAccount",
      "DesignProject",
      "ProjectJob",
      "GeneratedAsset",
      "BrandMemory",
    ];
    const missing = required.filter((t) => !names.has(t));
    record(
      "1",
      "PRD tables exist",
      missing.length === 0,
      missing.length ? `missing: ${missing.join(", ")}` : `${required.length} core tables`,
    );
  }

  // Phase 2 — Blueprint
  const baseTheme = path.join(repoRoot, "base theme");
  record("2", "base theme folder", existsSync(baseTheme));
  try {
    const blueprint = await buildBlueprintFromLocalTheme(baseTheme);
    ThemeBlueprintSchema.parse(blueprint);
    record(
      "2",
      "Blueprint from Horizon Pro",
      blueprint.sections.length > 100 && blueprint.themeName === "Horizon Pro",
      `${blueprint.sections.length} sections`,
    );
    record(
      "2",
      "editorial-hero in blueprint",
      blueprint.sections.some((s) => s.type === "editorial-hero"),
    );
  } catch (e) {
    record("2", "Blueprint build", false, String(e).slice(0, 120));
  }

  // Phase 3 — Golden agent outputs
  record(
    "3",
    "Golden agent fixtures validate",
    (() => {
      try {
        AgentOutputsSchema.parse(GOLDEN_AGENT_OUTPUTS);
        return true;
      } catch {
        return false;
      }
    })(),
  );

  // Phase 5 — Compiler + safety pipeline
  try {
    const blueprint = await buildBlueprintFromLocalTheme(baseTheme);
    const allowedTypes = new Set(blueprint.sections.map((section) => section.type));
    const layout = {
      ...GOLDEN_AGENT_OUTPUTS.layout,
      sectionOrder: GOLDEN_AGENT_OUTPUTS.layout.sectionOrder.filter((type) =>
        allowedTypes.has(type),
      ),
    };
    const compiled = compileTheme({
      projectId: "00000000-0000-4000-8000-000000000099",
      shop: "smoke.myshopify.com",
      productIds: ["gid://shopify/Product/1"],
      stylePreset: "high-converting",
      blueprint,
      vision: GOLDEN_AGENT_OUTPUTS.vision,
      copy: GOLDEN_AGENT_OUTPUTS.copy,
      layout,
      image: GOLDEN_AGENT_OUTPUTS.image,
    });
    record(
      "5",
      "compileTheme deterministic output",
      compiled.indexJson.order.length > 0 && compiled.sections.length > 0,
      `${compiled.sections.length} sections`,
    );

    const safety = runSafetyPipeline({
      blueprint,
      outputs: {
        ...GOLDEN_AGENT_OUTPUTS,
        layout,
        compiler: {
          indexJson: compiled.indexJson,
          settingsPatch: compiled.settingsData,
          cssVariables: compiled.cssVariables,
        },
      },
    });
    record("5", "safety pipeline passes golden outputs", safety.passed);
  } catch (e) {
    record("5", "Compiler + safety", false, String(e).slice(0, 120));
  }

  record(
    "5",
    "upload processor module",
    existsSync(path.join(repoRoot, "packages", "api", "src", "workers", "upload.processor.ts")),
  );

  record(
    "6",
    "preview URL builder",
    buildStorefrontPreviewUrl(
      "demo.myshopify.com",
      "gid://shopify/OnlineStoreTheme/1",
    ) === "https://demo.myshopify.com/?preview_theme_id=1",
  );

  try {
    const blueprint = await buildBlueprintFromLocalTheme(baseTheme);
    const layout = {
      ...GOLDEN_AGENT_OUTPUTS.layout,
      sectionOrder: GOLDEN_AGENT_OUTPUTS.layout.sectionOrder.filter((type) =>
        blueprint.sections.some((section) => section.type === type),
      ),
    };
    const state = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000088",
      blueprint,
      {
        ...GOLDEN_AGENT_OUTPUTS,
        layout,
      },
    );
    const edited = applyPreviewPatch(
      state,
      {
        op: "updateSection",
        sectionId: state.order[0],
        settings: { heading: "Smoke edit" },
      },
      blueprint,
    );
    record(
      "7",
      "preview patch updates section",
      edited.sections.find((section) => section.id === state.order[0])
        ?.settings.heading === "Smoke edit",
    );
  } catch (e) {
    record("7", "preview patch", false, String(e).slice(0, 120));
  }

  try {
    const blueprintForChat = await buildBlueprintFromLocalTheme(baseTheme);
    const layoutForChat = {
      ...GOLDEN_AGENT_OUTPUTS.layout,
      sectionOrder: GOLDEN_AGENT_OUTPUTS.layout.sectionOrder.filter((type) =>
        blueprintForChat.sections.some((section) => section.type === type),
      ),
    };
    const chatState = buildPreviewStateFromOutputs(
      "00000000-0000-4000-8000-000000000088",
      blueprintForChat,
      { ...GOLDEN_AGENT_OUTPUTS, layout: layoutForChat },
    );
    const intent = parseChatIntentMock({
      message: "Change colors to black",
      state: chatState,
      blueprint: blueprintForChat,
    });
    record(
      "8",
      "chat intent maps color change",
      intent.patches.some((patch) => patch.op === "updateTheme"),
    );
    record(
      "8",
      "adversarial prompt catalog",
      ADVERSARIAL_CHAT_PROMPTS.length >= 50,
      `${ADVERSARIAL_CHAT_PROMPTS.length} prompts`,
    );
    record(
      "8",
      "sanitize blocks liquid",
      !sanitizeChatMessage("{% assign x = 1 %}").ok,
    );
  } catch (e) {
    record("8", "chat intent", false, String(e).slice(0, 120));
  }

  try {
    const files = compilerToThemeFiles(GOLDEN_AGENT_OUTPUTS.compiler);
    const snapshot = buildSnapshotFromCompiler(GOLDEN_AGENT_OUTPUTS.compiler, {
      themeId: null,
      source: "preview",
    });
    record("9", "compilerToThemeFiles", files.length === 2);
    record("9", "theme snapshot builder", snapshot.source === "preview");
    record(
      "9",
      "apply service module",
      existsSync(
        path.join(repoRoot, "packages", "api", "src", "projects", "apply.service.ts"),
      ),
    );
  } catch (e) {
    record("9", "apply pipeline", false, String(e).slice(0, 120));
  }

  record("10", "runbook.md", existsSync(path.join(repoRoot, "docs", "runbook.md")));
  record("10", "Dockerfile", existsSync(path.join(repoRoot, "Dockerfile")));
  record(
    "10",
    "structured logger",
    existsSync(path.join(repoRoot, "packages", "api", "src", "common", "logger.ts")),
  );
  record(
    "10",
    "rate limit middleware",
    existsSync(
      path.join(repoRoot, "packages", "api", "src", "common", "rate-limit.middleware.ts"),
    ),
  );
  record(
    "10",
    "security audit script",
    existsSync(path.join(repoRoot, "scripts", "security-audit.mjs")),
  );

  // Phase 1+3 E2E via DB if connected
  if (dbOk) {
    const shop = `cross-test-${Date.now()}.myshopify.com`;
    try {
      const account = await prisma.userAccount.create({ data: { shop } });
      const project = await prisma.designProject.create({
        data: {
          shop,
          merchantId: shop,
          productIds: ["gid://shopify/Product/1"],
          stylePreset: "high-converting",
          status: "BLUEPRINT_READY",
          userAccountId: account.id,
          blueprint: (await buildBlueprintFromLocalTheme(baseTheme)),
          jobs: {
            create: [
              "VISION",
              "COPY",
              "IMAGE",
              "LAYOUT",
              "COMPILER",
              "UPLOAD",
              "VALIDATION",
            ].map((type) => ({ type, status: "PENDING" })),
          },
        },
        include: { jobs: true },
      });

      record("1", "Create design_project + 7 jobs", project.jobs.length === 7);

      await prisma.designProject.update({
        where: { id: project.id },
        data: {
          status: "AGENTS_COMPLETE",
          agentOutputs: GOLDEN_AGENT_OUTPUTS,
        },
      });

      await prisma.brandMemory.create({
        data: {
          projectId: project.id,
          shop,
          tone: GOLDEN_AGENT_OUTPUTS.vision.tone,
          colors: { primary: GOLDEN_AGENT_OUTPUTS.vision.primaryColors },
        },
      });

      const loaded = await prisma.designProject.findUnique({
        where: { id: project.id },
        include: { jobs: true, brandMemories: true },
      });

      record(
        "3",
        "agentOutputs persisted",
        loaded?.status === "AGENTS_COMPLETE" && loaded.agentOutputs !== null,
      );
      record(
        "3",
        "brand_memory persisted",
        (loaded?.brandMemories.length ?? 0) > 0,
      );

      await prisma.projectEvent.create({
        data: {
          projectId: project.id,
          step: "PREVIEW_READY",
          message: "Preview Ready",
          status: "COMPLETE",
        },
      });
      const eventCount = await prisma.projectEvent.count({
        where: { projectId: project.id },
      });
      record("4", "ProjectEvent persisted", eventCount === 1);

      // cleanup
      await prisma.designProject.delete({ where: { id: project.id } });
      await prisma.userAccount.delete({ where: { id: account.id } });
      record("1", "DB cleanup", true);
    } catch (e) {
      record("1+3", "DB E2E flow", false, String(e).slice(0, 150));
    }
  }

  await prisma.$disconnect();

  const failed = results.filter((r) => !r.pass);
  console.log("\n=== Summary ===");
  console.log(`Total: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failed) {
      console.log(`  - Phase ${f.phase}: ${f.check}${f.detail ? ` (${f.detail})` : ""}`);
    }
    process.exit(1);
  }

  console.log("\nAll cross-phase checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
