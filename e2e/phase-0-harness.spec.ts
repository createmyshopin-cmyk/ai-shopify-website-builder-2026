import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const repoRoot = process.cwd();

/**
 * UJ-08 — webhook + production file checks.
 * Full OAuth flows require a dev store + tunnel (manual QA).
 */
test.describe("UJ-08 production harness", () => {
  test("webhook routes exist and use Shopify authenticate", async () => {
    const webhooks = [
      "mvp/app/routes/webhooks.app.uninstalled.tsx",
      "mvp/app/routes/webhooks.app.scopes_update.tsx",
    ];

    for (const relative of webhooks) {
      const full = path.join(repoRoot, relative);
      expect(existsSync(full)).toBe(true);
      const source = readFileSync(full, "utf8");
      expect(source).toContain("authenticate.webhook");
    }
  });

  test("production deploy artifacts exist", async () => {
    expect(existsSync(path.join(repoRoot, "Dockerfile"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "docs", "runbook.md"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "docker-compose.prod.yml"))).toBe(true);
  });
});
