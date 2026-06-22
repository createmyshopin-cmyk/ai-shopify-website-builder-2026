import type { CompilerOutput } from "../agents/types.js";
import type { PreviewState } from "../preview/types.js";
import { previewStateToCompilerOutput } from "../preview/preview-state.js";
import { ThemeSnapshotSchema, type ThemeSnapshot } from "./types.js";

export function compilerToThemeFiles(compiler: CompilerOutput): Array<{
  filename: string;
  content: string;
}> {
  return [
    {
      filename: "templates/index.json",
      content: JSON.stringify(compiler.indexJson, null, 2),
    },
    {
      filename: "config/settings_data.json",
      content: JSON.stringify({ current: compiler.settingsPatch }, null, 2),
    },
  ];
}

export function buildSnapshotFromCompiler(
  compiler: CompilerOutput,
  options: {
    themeId: string | null;
    source: ThemeSnapshot["source"];
  },
): ThemeSnapshot {
  return ThemeSnapshotSchema.parse({
    themeId: options.themeId,
    compiler,
    capturedAt: new Date().toISOString(),
    source: options.source,
  });
}

export function buildSnapshotFromPreviewState(
  state: PreviewState,
  themeId: string | null,
): ThemeSnapshot {
  return buildSnapshotFromCompiler(previewStateToCompilerOutput(state), {
    themeId,
    source: "preview",
  });
}

export function parseSnapshotFromThemeFiles(
  themeId: string | null,
  files: Array<{ filename: string; content: string }>,
  source: ThemeSnapshot["source"] = "live",
): ThemeSnapshot | null {
  const indexFile = files.find((file) => file.filename === "templates/index.json");
  const settingsFile = files.find(
    (file) => file.filename === "config/settings_data.json",
  );

  if (!indexFile || !settingsFile) {
    return null;
  }

  try {
    const indexJson = JSON.parse(indexFile.content) as {
      sections: Record<string, unknown>;
      order: string[];
    };
    const settingsPayload = JSON.parse(settingsFile.content) as {
      current?: Record<string, unknown>;
    };

    return buildSnapshotFromCompiler(
      {
        indexJson,
        settingsPatch: settingsPayload.current ?? {},
        cssVariables: {},
      },
      { themeId, source },
    );
  } catch {
    return null;
  }
}
