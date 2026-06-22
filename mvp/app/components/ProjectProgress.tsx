import { useEffect, useMemo, useState } from "react";

import {
  PRD_PROGRESS_MESSAGES,
  type ProjectProgressEvent,
} from "@theme-editor/shared";

import { AppRouteLink } from "~/components/AppRouteLink";

const PRD_STEPS = [
  "Analyzing Product",
  "Generating Assets",
  "Uploading Images",
  "Compiling Theme",
  "Validating",
  "Preview Ready",
] as const;

interface ProjectProgressProps {
  projectId: string;
  shop: string;
  apiBase: string;
  previewHref?: string;
}

interface ApiEvent {
  id: string;
  step: string;
  message: string;
  status: string;
  createdAt: string;
}

export function ProjectProgress({
  projectId,
  shop,
  apiBase,
  previewHref,
}: ProjectProgressProps) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `${apiBase}/api/projects/events/${projectId}`,
          {
            headers: { "x-shop-domain": shop },
          },
        );

        if (!response.ok) {
          throw new Error(`Progress poll failed (${response.status})`);
        }

        const payload = (await response.json()) as { events: ApiEvent[] };
        if (!cancelled) {
          setEvents(payload.events ?? []);
          setError(null);
        }
      } catch (pollError) {
        if (!cancelled) {
          const message =
            pollError instanceof Error
              ? pollError.message
              : "Failed to load progress";
          setError(message);
        }
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBase, projectId, shop]);

  const activeMessage = useMemo(() => {
    if (events.length === 0) {
      return PRD_PROGRESS_MESSAGES.VISION;
    }
    return events[events.length - 1]?.message ?? PRD_PROGRESS_MESSAGES.VISION;
  }, [events]);

  const isComplete = events.some(
    (event) =>
      event.step === "PREVIEW_READY" && event.status === "COMPLETE",
  );

  const stepStates = useMemo(() => {
    const completedMessages = new Set(
      events
        .filter((event) => event.status === "COMPLETE" || event.status === "SKIPPED")
        .map((event) => event.message),
    );

    const activeIndex = PRD_STEPS.findIndex((step) => step === activeMessage);

    return PRD_STEPS.map((step, index) => {
      if (completedMessages.has(step) || (isComplete && step === "Preview Ready")) {
        return { step, state: "complete" as const };
      }
      if (index === activeIndex) {
        return { step, state: "active" as const };
      }
      if (index < activeIndex) {
        return { step, state: "complete" as const };
      }
      return { step, state: "pending" as const };
    });
  }, [activeMessage, events, isComplete]);

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">
        {isComplete ? "Preview Ready" : activeMessage}
      </p>
      <ol className="mt-3 space-y-2">
        {stepStates.map(({ step, state }) => (
          <li
            key={step}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              className={
                state === "complete"
                  ? "text-green-600"
                  : state === "active"
                    ? "text-primary font-medium"
                    : ""
              }
            >
              {state === "complete" ? "✓" : state === "active" ? "…" : "○"}
            </span>
            <span className={state === "active" ? "text-foreground" : ""}>
              {step}
            </span>
          </li>
        ))}
      </ol>
      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : null}
      {isComplete ? (
        <div className="mt-4">
          <AppRouteLink
            to={previewHref ?? `/app/projects/${projectId}/preview`}
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Open preview dashboard →
          </AppRouteLink>
        </div>
      ) : null}
    </div>
  );
}

export type { ProjectProgressEvent };
