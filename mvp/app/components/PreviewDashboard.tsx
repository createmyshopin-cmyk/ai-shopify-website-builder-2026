import { useEffect, useState } from "react";

import {
  getPresetLabel,
  isStylePresetId,
  type ProjectPreviewResponse,
  type PreviewState,
} from "@theme-editor/shared";

import { VisualEditor } from "~/components/editor/VisualEditor";
import { SectionStackPreview } from "~/components/editor/SectionStackPreview";
import { ChatPanel } from "~/components/editor/ChatPanel";
import { ApplyApprovalPanel } from "~/components/editor/ApplyApprovalPanel";
import { fetchPreviewState } from "~/hooks/use-preview-editor";
import { ProjectProgress } from "./ProjectProgress";

interface PreviewDashboardProps {
  projectId: string;
  shop: string;
  apiBase: string;
  initialPreview: ProjectPreviewResponse;
}

export function PreviewDashboard({
  projectId,
  shop,
  apiBase,
  initialPreview,
}: PreviewDashboardProps) {
  const [preview, setPreview] = useState(initialPreview);
  const [editorState, setEditorState] = useState<PreviewState | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const retryDraftProvision = async () => {
    setProvisioning(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBase}/api/projects/provision-draft/${projectId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shop-domain": shop,
          },
          body: "{}",
        },
      );

      const payload = (await response.json()) as ProjectPreviewResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : `Provision failed (${response.status})`,
        );
      }

      setPreview(payload);
    } catch (provisionError) {
      setError(
        provisionError instanceof Error
          ? provisionError.message
          : "Failed to provision draft theme",
      );
    } finally {
      setProvisioning(false);
    }
  };

  const handleEditorStateFromChat = (state: PreviewState) => {
    setEditorState(state);
    setEditorKey((value) => value + 1);
  };

  useEffect(() => {
    if (!preview.ready) {
      return;
    }

    let cancelled = false;

    const loadState = async () => {
      try {
        const response = await fetchPreviewState(shop, projectId, apiBase);
        if (!cancelled) {
          setEditorState(response.state);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load editor state",
          );
        }
      }
    };

    void loadState();
    return () => {
      cancelled = true;
    };
  }, [apiBase, preview.ready, projectId, shop]);

  useEffect(() => {
    if (preview.ready) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `${apiBase}/api/projects/preview/${projectId}`,
          { headers: { "x-shop-domain": shop } },
        );

        if (!response.ok) {
          throw new Error(`Preview poll failed (${response.status})`);
        }

        const payload = (await response.json()) as ProjectPreviewResponse;
        if (!cancelled) {
          setPreview(payload);
          setError(null);
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : "Failed to load preview",
          );
        }
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBase, preview.ready, projectId, shop]);

  if (!preview.ready) {
    return (
      <div className="space-y-4">
        <s-banner tone="info">
          {preview.message} — preview is gated until validation passes.
        </s-banner>
        <ProjectProgress projectId={projectId} shop={shop} apiBase={apiBase} />
        {error ? <s-banner tone="critical">{error}</s-banner> : null}
      </div>
    );
  }

  const metadata = preview.metadata;
  const styleLabel =
    metadata && isStylePresetId(metadata.stylePreset)
      ? getPresetLabel(metadata.stylePreset)
      : metadata?.stylePreset;

  return (
    <div className="space-y-4">
      <s-banner tone="success">{preview.message}</s-banner>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Style preset</p>
        <p className="text-base font-semibold">{styleLabel}</p>
      </div>

      {editorState ? (
        <>
          {!preview.previewUrl ? (
            <s-banner tone="info">
              No storefront iframe yet. Click &quot;Retry draft theme &amp; upload&quot;
              to duplicate your live theme and push AI files.
            </s-banner>
          ) : null}

          {!preview.previewUrl ? (
            <s-button
              variant="primary"
              disabled={provisioning}
              onClick={() => void retryDraftProvision()}
            >
              {provisioning ? "Provisioning draft theme…" : "Retry draft theme & upload"}
            </s-button>
          ) : null}

          <SectionStackPreview state={editorState} />

          <ChatPanel
            projectId={projectId}
            shop={shop}
            apiBase={apiBase}
            onStateUpdated={handleEditorStateFromChat}
          />
          <ApplyApprovalPanel
            projectId={projectId}
            shop={shop}
            apiBase={apiBase}
          />
          <VisualEditor
            key={editorKey}
            projectId={projectId}
            shop={shop}
            apiBase={apiBase}
            initialState={editorState}
          />
        </>
      ) : (
        <s-banner tone="info">Loading visual editor…</s-banner>
      )}

      {preview.previewUrl ? (
        <s-stack direction="inline" gap="base">
          <s-button
            variant="primary"
            onClick={() => window.open(preview.previewUrl ?? "", "_blank")}
          >
            Open storefront preview
          </s-button>
          {preview.adminEditorUrl ? (
            <s-button
              variant="secondary"
              onClick={() =>
                window.open(preview.adminEditorUrl ?? "", "_blank")
              }
            >
              Open theme editor
            </s-button>
          ) : null}
        </s-stack>
      ) : (
        <s-banner tone="info">
          Draft theme not linked — enable Shopify Theme API access to upload
          files and show the storefront iframe. Compiled preview is shown above
          when editor state is loaded.
        </s-banner>
      )}

      {preview.previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
          <iframe
            title="Draft theme preview"
            src={preview.previewUrl}
            className="h-[min(50vh,520px)] w-full bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : null}

      {error ? <s-banner tone="critical">{error}</s-banner> : null}
    </div>
  );
}
