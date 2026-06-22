import type { PreviewSection, PreviewState } from "@theme-editor/shared";

import { cn } from "~/lib/utils";

function setting(section: PreviewSection, ...keys: string[]): string {
  for (const key of keys) {
    const value = section.settings[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "";
}

function SectionBlock({ section }: { section: PreviewSection }) {
  const heading = setting(section, "heading", "title", "headline");
  const subheading = setting(
    section,
    "subheading",
    "text",
    "description",
    "body",
  );
  const image = setting(section, "image", "image_url", "background_image");
  const cta = setting(section, "button_label", "cta", "link_label");
  const primary =
    typeof section.settings.color_primary === "string"
      ? section.settings.color_primary
      : "#1a1a1a";

  const isHero =
    section.type.includes("hero") || section.type.includes("banner");

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-white",
        isHero ? "text-center" : "",
      )}
    >
      {image ? (
        <div
          className={cn(
            "bg-muted",
            isHero ? "aspect-[21/9] w-full" : "aspect-video w-full max-h-48",
          )}
        >
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className={cn("p-4", isHero ? "py-8" : "")}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {section.type}
        </p>
        {heading ? (
          <h3
            className={cn(
              "mt-1 font-semibold text-foreground",
              isHero ? "text-2xl sm:text-3xl" : "text-lg",
            )}
          >
            {heading}
          </h3>
        ) : null}
        {subheading ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {subheading}
          </p>
        ) : null}
        {cta ? (
          <span
            className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            {cta}
          </span>
        ) : null}
        {!heading && !subheading && !image ? (
          <p className="mt-2 text-sm italic text-muted-foreground">
            No preview content for this section yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

interface SectionStackPreviewProps {
  state: PreviewState;
  className?: string;
}

/** In-app compiled preview when Shopify draft theme / iframe URL is unavailable. */
export function SectionStackPreview({
  state,
  className,
}: SectionStackPreviewProps) {
  const ordered = state.order
    .map((id) => state.sections.find((section) => section.id === id))
    .filter((section): section is PreviewSection =>
      Boolean(section?.enabled),
    );

  if (ordered.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Enable at least one section to see a preview.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/20",
        className,
      )}
    >
      <div className="border-b border-border bg-card px-4 py-2">
        <p className="text-sm font-medium text-foreground">Compiled preview</p>
        <p className="text-xs text-muted-foreground">
          Renders from your section settings. Storefront iframe appears when a
          draft theme is provisioned on Shopify.
        </p>
      </div>
      <div className="max-h-[min(60vh,640px)] space-y-3 overflow-y-auto p-4">
        {ordered.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
