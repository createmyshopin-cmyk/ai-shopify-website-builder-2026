import { useCallback, useState } from "react";

import type {
  PreviewPatch,
  PreviewState,
  PreviewStateResponse,
} from "@theme-editor/shared";

interface UsePreviewEditorOptions {
  projectId: string;
  shop: string;
  apiBase: string;
  initialState: PreviewState;
}

export function usePreviewEditor({
  projectId,
  shop,
  apiBase,
  initialState,
}: UsePreviewEditorOptions) {
  const [state, setState] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<PreviewState | null>(null);

  const applyPatch = useCallback(
    async (patch: PreviewPatch, options?: { skipUndo?: boolean }) => {
      if (!options?.skipUndo) {
        setUndoSnapshot(state);
      }

      setSaving(true);
      setError(null);

      try {
        const response = await fetch(
          `${apiBase}/api/projects/preview/${projectId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-shop-domain": shop,
            },
            body: JSON.stringify({ patch }),
          },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? `Save failed (${response.status})`);
        }

        const payload = (await response.json()) as { state: PreviewState };
        setState(payload.state);
      } catch (patchError) {
        if (!options?.skipUndo) {
          setUndoSnapshot(null);
        }
        setError(
          patchError instanceof Error ? patchError.message : "Failed to save edit",
        );
      } finally {
        setSaving(false);
      }
    },
    [apiBase, projectId, shop, state],
  );

  const undo = useCallback(() => {
    if (!undoSnapshot) {
      return;
    }
    const snapshot = undoSnapshot;
    setUndoSnapshot(null);
    void applyPatch({ op: "restore", snapshot }, { skipUndo: true });
  }, [applyPatch, undoSnapshot]);

  return {
    state,
    applyPatch,
    undo,
    canUndo: undoSnapshot !== null,
    saving,
    error,
  };
}

export async function fetchPreviewState(
  shop: string,
  projectId: string,
  apiBase: string,
): Promise<PreviewStateResponse> {
  const response = await fetch(
    `${apiBase}/api/projects/preview/${projectId}/state`,
    { headers: { "x-shop-domain": shop } },
  );

  if (!response.ok) {
    throw new Error(`Preview state failed (${response.status})`);
  }

  return (await response.json()) as PreviewStateResponse;
}
