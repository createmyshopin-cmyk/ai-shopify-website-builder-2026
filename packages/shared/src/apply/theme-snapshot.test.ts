import { describe, expect, it } from "vitest";

import { GOLDEN_AGENT_OUTPUTS } from "../agents/fixtures.js";
import {
  buildSnapshotFromCompiler,
  compilerToThemeFiles,
  parseSnapshotFromThemeFiles,
} from "./theme-snapshot.js";

describe("theme snapshot helpers", () => {
  it("builds theme files from compiler output", () => {
    const files = compilerToThemeFiles(GOLDEN_AGENT_OUTPUTS.compiler!);
    expect(files).toHaveLength(2);
    expect(files[0]?.filename).toBe("templates/index.json");
    expect(files[1]?.filename).toBe("config/settings_data.json");
  });

  it("round-trips snapshot from theme files", () => {
    const files = compilerToThemeFiles(GOLDEN_AGENT_OUTPUTS.compiler!);
    const parsed = parseSnapshotFromThemeFiles("gid://shopify/Theme/1", files);
    expect(parsed?.compiler.indexJson.order).toEqual(
      GOLDEN_AGENT_OUTPUTS.compiler!.indexJson.order,
    );
  });

  it("builds snapshot metadata", () => {
    const snapshot = buildSnapshotFromCompiler(GOLDEN_AGENT_OUTPUTS.compiler!, {
      themeId: "gid://shopify/Theme/1",
      source: "preview",
    });
    expect(snapshot.source).toBe("preview");
    expect(snapshot.themeId).toContain("Theme");
  });
});
