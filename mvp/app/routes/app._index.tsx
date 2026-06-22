import { useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useNavigate, useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { ClientErrorBoundary } from "~/components/ClientErrorBoundary";
import { ClientOnly } from "~/components/ClientOnly";
import { ProductPickerModal } from "~/components/product-picker";
import { cn } from "~/lib/utils";
import { MAX_PICKER_SELECTIONS } from "~/components/product-picker/types";
import { authenticate } from "../shopify.server";

const MIN_SELECTION_COUNT = 1;
const MAX_SELECTION_COUNT = MAX_PICKER_SELECTIONS;

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Select products",
    description:
      "Pick 1–5 products or variants to feature on your landing page.",
  },
  {
    step: 2,
    title: "Choose a style",
    description: "Select a design direction that matches your brand.",
  },
  {
    step: 3,
    title: "Preview & refine",
    description: "Review the AI-generated theme and edit with chat or drag-and-drop.",
  },
] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const canProceed =
    selectedProducts.length >= MIN_SELECTION_COUNT &&
    selectedProducts.length <= MAX_SELECTION_COUNT;
  const selectionProgress = Math.min(
    100,
    (selectedProducts.length / MAX_SELECTION_COUNT) * 100,
  );

  const selectionHint =
    selectedProducts.length === 0
      ? `Select ${MIN_SELECTION_COUNT} to ${MAX_SELECTION_COUNT} products to continue.`
      : selectedProducts.length < MAX_SELECTION_COUNT
        ? `${selectedProducts.length} selected — add up to ${MAX_SELECTION_COUNT - selectedProducts.length} more or continue.`
        : "Ready — continue to pick a style preset.";

  const handleNext = () => {
    if (!canProceed) return;
    navigate(`/app/styles?ids=${selectedProducts.join(",")}`);
  };

  return (
    <s-page heading="AI Theme Editor">
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!canProceed}
        onClick={handleNext}
      >
        Continue to styles
      </s-button>

      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
          AI-powered theme builder
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Generate high-converting landing pages in minutes
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Select your products, choose a style preset, and let AI build a draft
          theme you can preview and refine before publishing.
        </p>
      </div>

      <s-section heading="How it works">
        <ol className="grid gap-4 sm:grid-cols-3">
          {ONBOARDING_STEPS.map(({ step, title, description }) => {
            const isActive = step === 1;
            const isDone =
              step === 1 && selectedProducts.length >= MIN_SELECTION_COUNT;

            return (
              <li
                key={step}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? "✓" : step}
                  </span>
                  <p className="font-semibold text-foreground">{title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </li>
            );
          })}
        </ol>
      </s-section>

      <ClientErrorBoundary>
        <s-section heading="Step 1 — Select products">
          <s-paragraph>
            Choose {MIN_SELECTION_COUNT} to {MAX_SELECTION_COUNT} products or
            variants. These will be featured in your AI-generated landing page.
          </s-paragraph>

          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedProducts.length} of {MAX_SELECTION_COUNT} selected
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectionHint}
                </p>
              </div>
              <s-stack direction="inline" gap="base">
                <s-button onClick={() => setPickerOpen(true)}>
                  {selectedProducts.length > 0
                    ? "Change selection"
                    : "Select products"}
                </s-button>
                <s-button
                  variant="primary"
                  disabled={!canProceed}
                  onClick={handleNext}
                >
                  Continue to styles
                </s-button>
              </s-stack>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${selectionProgress}%` }}
              />
            </div>
          </div>

          <ClientOnly>
            <ProductPickerModal
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onConfirm={(payload) => {
                setSelectedProducts(payload.selectedIds);
                shopify.toast.show(
                  `Selected ${payload.items.length} item${
                    payload.items.length === 1 ? "" : "s"
                  }`,
                );
              }}
            />
          </ClientOnly>
        </s-section>
      </ClientErrorBoundary>

      <s-section slot="aside" heading="What you get">
        <s-unordered-list>
          <s-list-item>
            Draft theme provisioned on your store for safe preview
          </s-list-item>
          <s-list-item>
            AI-generated sections based on your base theme structure
          </s-list-item>
          <s-list-item>
            Visual editor with chat-based modifications
          </s-list-item>
          <s-list-item>Merchant approval before anything goes live</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Your projects">
        <s-paragraph>
          Track generation progress and open previews from the projects page.
        </s-paragraph>
        <s-link href="/app/projects">View all projects →</s-link>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : "This page failed to render inside the embedded app.";

  return (
    <s-page heading="Page error">
      <s-banner tone="critical">{message}</s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
