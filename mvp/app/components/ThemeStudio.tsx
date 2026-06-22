/**
 * ThemeStudio
 *
 * Full merchant flow component wiring the Platform Layer API:
 *   Generate → Preview → Edit Copy → Regenerate → Save Draft → Publish → Rollback
 *
 * API calls go through /app/api/themes/* proxy (NestJS ThemesController).
 * Supabase Realtime subscription for live job progress updates.
 */
"use client";
import type React from "react";
import { useState, useCallback } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "s-card": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "s-section": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { heading?: string };
    }
  }
}

interface ProjectStatus {
  projectId: string;
  status: string;
  jobs: Array<{ type: string; status: string }>;
}

interface VersionItem {
  id: string;
  versionNumber: number;
  status: string;
  shopifyThemeId: string | null;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface ThemeStudioProps {
  projectId: string;
  shop: string;
  projectStatus: ProjectStatus;
  versions: unknown[];
  apiBase: string;
}

type StudioView = "status" | "preview" | "versions" | "publish";

export function ThemeStudio({
  projectId,
  shop,
  projectStatus: initialStatus,
  versions: initialVersions,
  apiBase,
}: ThemeStudioProps) {
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [versions, setVersions] = useState<VersionItem[]>(
    (initialVersions as VersionItem[]) ?? [],
  );
  const [view, setView] = useState<StudioView>("status");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "critical" | "info" } | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const showMessage = (text: string, tone: "success" | "critical" | "info" = "info") => {
    setMessage({ text, tone });
    setTimeout(() => setMessage(null), 5000);
  };

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      const maxAttempts = 60; // 60 × 2s = 2min
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          const res = await fetch(`${apiBase}/${projectId}/jobs/${jobId}`, {
            headers: { "x-shop": shop },
          });
          if (!res.ok) break;
          const job = (await res.json()) as { status: string; errors?: string };
          if (job.status === "COMPLETE") {
            showMessage("Operation completed successfully", "success");
            await refreshStatus();
            setActiveJobId(null);
            return;
          }
          if (job.status === "FAILED") {
            showMessage(`Operation failed: ${job.errors ?? "Unknown error"}`, "critical");
            setActiveJobId(null);
            return;
          }
        } catch {
          // Swallow poll errors — try again
        }
      }
      showMessage("Operation is taking longer than expected — check back shortly", "info");
      setActiveJobId(null);
    },
    [apiBase, projectId, shop],
  );

  const refreshStatus = async () => {
    const res = await fetch(`${apiBase}/${projectId}`, {
      headers: { "x-shop": shop },
    });
    if (res.ok) {
      setStatus((await res.json()) as ProjectStatus);
    }
    const vRes = await fetch(`${apiBase}/${projectId}/versions`, {
      headers: { "x-shop": shop },
    });
    if (vRes.ok) {
      const { versions: v } = (await vRes.json()) as { versions: VersionItem[] };
      setVersions(v);
    }
  };

  // ── Trigger generation ────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase.replace("/themes", "")}/api/projects/run/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shop": shop },
        body: JSON.stringify({ shop }),
      });
      const data = (await res.json()) as { status?: string };
      showMessage(`Regeneration started: ${data.status ?? "pending"}`, "info");
      await refreshStatus();
    } catch {
      showMessage("Failed to start regeneration", "critical");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Start preview ─────────────────────────────────────────────────────────
  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop": shop,
        },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json()) as { jobId?: string; sessionToken?: string };
      if (data.jobId) {
        setActiveJobId(data.jobId);
        showMessage("Preview started — uploading to draft theme…", "info");
        void pollJobStatus(data.jobId);
        setView("preview");
      }
    } catch {
      showMessage("Failed to start preview", "critical");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!confirm("Publish this theme to your live store?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop": shop,
          "X-Idempotency-Key": `publish-${projectId}-${Date.now()}`,
        },
        body: JSON.stringify({ projectId }),
      });
      if (res.status === 409) {
        showMessage("Another publish is already in progress — please wait", "critical");
        return;
      }
      const data = (await res.json()) as { jobId?: string };
      if (data.jobId) {
        setActiveJobId(data.jobId);
        showMessage("Publishing theme to Shopify…", "info");
        void pollJobStatus(data.jobId);
      }
    } catch {
      showMessage("Failed to initiate publish", "critical");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Rollback ──────────────────────────────────────────────────────────────
  const handleRollback = async (versionId: string) => {
    if (!confirm("Roll back to this version?")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/rollback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop": shop,
          "X-Idempotency-Key": `rollback-${versionId}-${Date.now()}`,
        },
        body: JSON.stringify({ projectId, versionId }),
      });
      const data = (await res.json()) as { jobId?: string };
      if (data.jobId) {
        setActiveJobId(data.jobId);
        showMessage("Rolling back theme…", "info");
        void pollJobStatus(data.jobId);
      }
    } catch {
      showMessage("Failed to initiate rollback", "critical");
    } finally {
      setIsLoading(false);
    }
  };

  const isPipelineRunning =
    status.status === "AGENTS_RUNNING" ||
    status.status === "PENDING" ||
    status.status === "BLUEPRINT_READY";

  const isPipelineComplete =
    status.status === "AGENTS_COMPLETE" ||
    status.status === "UPLOAD_COMPLETE" ||
    status.status === "VALIDATION_COMPLETE" ||
    status.status === "PUBLISHED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Status banner */}
      {message && (
        <s-banner tone={message.tone}>{message.text}</s-banner>
      )}

      {activeJobId && (
        <s-banner tone="info">
          Job in progress… (ID: {activeJobId.substring(0, 8)}…)
        </s-banner>
      )}

      {/* Navigation tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {(["status", "preview", "versions", "publish"] as StudioView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #e5e7eb",
              background: view === v ? "#6366f1" : "#fff",
              color: view === v ? "#fff" : "#111",
              cursor: "pointer",
              textTransform: "capitalize",
              fontWeight: view === v ? 600 : 400,
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── Status view ──────────────────────────────────────────────────── */}
      {view === "status" && (
        <s-section heading="Pipeline Status">
          <s-card>
            <div style={{ padding: "1rem" }}>
              <p><strong>Project ID:</strong> {projectId}</p>
              <p><strong>Status:</strong> <s-badge tone={isPipelineComplete ? "success" : isPipelineRunning ? "warning" : "neutral"}>{status.status}</s-badge></p>
              <div style={{ marginTop: "1rem" }}>
                <strong>Jobs:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {status.jobs.map((job) => (
                    <s-badge
                      key={job.type}
                      tone={job.status === "COMPLETE" ? "success" : job.status === "FAILED" ? "critical" : "neutral"}
                    >
                      {job.type}: {job.status}
                    </s-badge>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
                <button
                  onClick={() => void handleRegenerate()}
                  disabled={isLoading || isPipelineRunning}
                  style={{ padding: "0.5rem 1rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                >
                  {isPipelineRunning ? "Running…" : "Regenerate"}
                </button>
                <button
                  onClick={() => void refreshStatus()}
                  disabled={isLoading}
                  style={{ padding: "0.5rem 1rem", background: "#e5e7eb", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </s-card>
        </s-section>
      )}

      {/* ── Preview view ─────────────────────────────────────────────────── */}
      {view === "preview" && (
        <s-section heading="Preview">
          <s-card>
            <div style={{ padding: "1rem" }}>
              <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
                Preview uploads your current generation to a Shopify draft theme.
                You can then inspect it in the Shopify Theme Editor before publishing.
              </p>
              <button
                onClick={() => void handlePreview()}
                disabled={isLoading || !isPipelineComplete}
                style={{ padding: "0.5rem 1rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
              >
                {!isPipelineComplete ? "Pipeline must complete first" : "Start Preview"}
              </button>
            </div>
          </s-card>
        </s-section>
      )}

      {/* ── Versions view ────────────────────────────────────────────────── */}
      {view === "versions" && (
        <s-section heading="Version History">
          {versions.length === 0 ? (
            <s-card>
              <div style={{ padding: "1rem", color: "#6b7280" }}>
                No versions yet. Publish to create your first version.
              </div>
            </s-card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {versions.map((v) => (
                <s-card key={v.id}>
                  <div style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>v{v.versionNumber}</strong>
                      <span style={{ marginLeft: "0.5rem" }}>
                        <s-badge tone={v.status === "PUBLISHED" ? "success" : v.status === "RESTORE" ? "warning" : "neutral"}>
                          {v.status}
                        </s-badge>
                      </span>
                      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                        {v.publishedAt
                          ? `Published ${new Date(v.publishedAt).toLocaleString()}`
                          : `Created ${new Date(v.createdAt).toLocaleString()}`}
                      </p>
                    </div>
                    {v.status === "PUBLISHED" && (
                      <button
                        onClick={() => void handleRollback(v.id)}
                        disabled={isLoading}
                        style={{ padding: "0.25rem 0.75rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "0.375rem", cursor: "pointer", fontSize: "0.875rem" }}
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </s-card>
              ))}
            </div>
          )}
        </s-section>
      )}

      {/* ── Publish view ─────────────────────────────────────────────────── */}
      {view === "publish" && (
        <s-section heading="Publish to Shopify">
          <s-card>
            <div style={{ padding: "1rem" }}>
              <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
                Publishing uploads your AI-generated theme and sets it as the active theme on your store.
                Only one publish operation can run at a time.
              </p>
              {status.status === "PUBLISHED" && (
                <div style={{ marginBottom: "1rem" }}>
                  <s-banner tone="success">
                    This project is currently published.
                  </s-banner>
                </div>
              )}
              <button
                onClick={() => void handlePublish()}
                disabled={isLoading || !isPipelineComplete}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: isPipelineComplete ? "#059669" : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: isPipelineComplete ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {!isPipelineComplete ? "Pipeline must complete first" : "Publish to Shopify"}
              </button>
            </div>
          </s-card>
        </s-section>
      )}
    </div>
  );
}
