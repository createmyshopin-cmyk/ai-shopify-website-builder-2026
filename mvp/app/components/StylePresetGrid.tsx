import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { ClientOnly } from "~/components/ClientOnly";
import { ProjectProgress } from "~/components/ProjectProgress";
import { cn } from "~/lib/utils";

import { STYLE_PRESETS } from "@theme-editor/shared";

interface StylesActionResponse {
  success: boolean;
  projectId?: string;
  message?: string;
  error?: string;
}

interface StylePresetGridProps {
  productIds: string[];
  productCountLabel: string;
  shop: string;
  projectApiUrl: string;
}

export function StylePresetGrid({
  productIds,
  productCountLabel,
  shop,
  projectApiUrl,
}: StylePresetGridProps) {
  return (
    <ClientOnly
      fallback={
        <p className="text-sm text-muted-foreground">Loading style picker…</p>
      }
    >
      <StylePresetGridClient
        productIds={productIds}
        productCountLabel={productCountLabel}
        shop={shop}
        projectApiUrl={projectApiUrl}
      />
    </ClientOnly>
  );
}

function StylePresetGridClient({
  productIds,
  productCountLabel,
  shop,
  projectApiUrl,
}: StylePresetGridProps) {
  const fetcher = useFetcher<StylesActionResponse>();
  const isSubmitting = fetcher.state === "submitting";

  return (
    <>
      <s-paragraph>{productCountLabel}</s-paragraph>

      <fetcher.Form method="post" className="mt-4 space-y-6">
        <fieldset className="grid gap-5 sm:grid-cols-3">
          <legend className="sr-only">Style presets</legend>
          {STYLE_PRESETS.map((preset) => (
            <label
              key={preset.id}
              aria-label={preset.label}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-2xl border-2 bg-card text-left transition-all",
                "hover:-translate-y-0.5 hover:shadow-md has-[:checked]:border-primary has-[:checked]:shadow-md has-[:checked]:ring-2 has-[:checked]:ring-primary/20",
                "border-border hover:border-primary/40",
              )}
            >
              <input
                type="radio"
                name="selectedStyle"
                value={preset.id}
                required
                className="sr-only"
                disabled={isSubmitting}
              />
              <div
                className="relative h-28 w-full"
                style={{ background: preset.gradient }}
              >
                <div className="absolute inset-0 flex items-end p-4">
                  <div className="flex gap-1.5">
                    {preset.colors.map((color) => (
                      <span
                        key={color}
                        className="h-5 w-5 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <span className="pointer-events-none absolute right-3 top-3 hidden rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-primary shadow-sm group-has-[:checked]:inline">
                  Selected
                </span>
              </div>
              <div className="p-5">
                <p className="text-base font-semibold text-foreground">
                  {preset.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {preset.description}
                </p>
              </div>
            </label>
          ))}
        </fieldset>

        {productIds.map((id) => (
          <input key={id} type="hidden" name="productIds" value={id} />
        ))}

        <div className="rounded-lg border border-dashed border-amber-300/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Select one style preset above, then click Create project. Your
          selection is saved to the database and the AI pipeline starts
          automatically.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting || productIds.length === 0}>
            {isSubmitting ? "Creating project…" : "Create project"}
          </Button>
          {productIds.length === 0 ? (
            <p className="text-sm text-destructive">
              No products in this session — go back and select products first.
            </p>
          ) : null}
        </div>
      </fetcher.Form>

      {fetcher.data?.success ? (
        <s-banner tone="success">
          Project created: {fetcher.data.projectId}. {fetcher.data.message}
        </s-banner>
      ) : null}

      {fetcher.data?.success && fetcher.data.projectId ? (
        <ProjectProgress
          projectId={fetcher.data.projectId}
          shop={shop}
          apiBase={projectApiUrl}
          previewHref={`/app/projects/${fetcher.data.projectId}/preview`}
        />
      ) : null}

      {fetcher.data?.error ? (
        <s-banner tone="critical">{fetcher.data.error}</s-banner>
      ) : null}
    </>
  );
}
