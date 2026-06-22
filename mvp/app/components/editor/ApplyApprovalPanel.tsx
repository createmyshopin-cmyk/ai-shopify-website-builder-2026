import { useCallback, useEffect, useState } from "react";

import type {
  ApplyProjectResponse,
  RollbackResponse,
  VersionListResponse,
} from "@theme-editor/shared";

interface ApplyApprovalPanelProps {
  projectId: string;
  shop: string;
  apiBase: string;
}

export function ApplyApprovalPanel({
  projectId,
  shop,
  apiBase,
}: ApplyApprovalPanelProps) {
  const [approved, setApproved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [versions, setVersions] = useState<VersionListResponse["versions"]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/projects/versions/${projectId}`, {
        headers: { "x-shop-domain": shop },
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as VersionListResponse;
      setVersions(payload.versions);
    } catch {
      // non-blocking
    }
  }, [apiBase, projectId, shop]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const applyTheme = async () => {
    if (!approved) {
      setError("Check the approval box before applying to your live theme.");
      return;
    }

    setApplying(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/projects/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop-domain": shop,
        },
        body: JSON.stringify({ projectId, approved: true }),
      });

      const payload = (await response.json()) as ApplyProjectResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? `Apply failed (${response.status})`);
      }

      setMessage(
        `${payload.message} — version ${payload.versionNumber} (backup ${payload.backupId.slice(0, 8)}…)`,
      );
      await loadVersions();
    } catch (applyError) {
      setError(
        applyError instanceof Error ? applyError.message : "Apply failed",
      );
    } finally {
      setApplying(false);
    }
  };

  const rollbackTheme = async (versionNumber?: number) => {
    setRollingBack(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${apiBase}/api/projects/rollback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop-domain": shop,
        },
        body: JSON.stringify({
          projectId,
          ...(versionNumber ? { versionNumber } : {}),
        }),
      });

      const payload = (await response.json()) as RollbackResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message ?? `Rollback failed (${response.status})`,
        );
      }

      setMessage(payload.message);
      await loadVersions();
    } catch (rollbackError) {
      setError(
        rollbackError instanceof Error
          ? rollbackError.message
          : "Rollback failed",
      );
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Approve & apply to live theme</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Updates your installed base theme (settings + homepage sections only). A
        backup is created automatically before each apply.
      </p>

      <label
        htmlFor="merchant-approve"
        className="mt-3 flex items-start gap-2 text-sm"
      >
        <input
          id="merchant-approve"
          type="checkbox"
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
          className="mt-1"
        />
        <span>
          I have reviewed the preview and approve applying these changes to my
          live theme.
        </span>
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <s-button
          variant="primary"
          disabled={!approved || applying}
          onClick={() => void applyTheme()}
        >
          {applying ? "Applying…" : "Apply to live theme"}
        </s-button>
        <s-button
          variant="secondary"
          disabled={rollingBack || versions.length < 2}
          onClick={() => void rollbackTheme()}
        >
          {rollingBack ? "Rolling back…" : "Rollback previous version"}
        </s-button>
      </div>

      {versions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Version history
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {versions.map((version) => (
              <li
                key={version.versionNumber}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1"
              >
                <span>
                  v{version.versionNumber}
                  {version.label ? ` — ${version.label}` : ""}
                </span>
                <s-button
                  variant="tertiary"
                  disabled={rollingBack}
                  onClick={() => void rollbackTheme(version.versionNumber)}
                >
                  Restore
                </s-button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? (
        <s-banner tone="success">{message}</s-banner>
      ) : null}
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
    </div>
  );
}
