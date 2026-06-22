import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { StylePresetGrid } from "~/components/StylePresetGrid";
import { authenticate } from "../shopify.server";
import { clientProjectApiBase } from "../services/project-api-proxy.server";

interface StylesActionResponse {
  success: boolean;
  projectId?: string;
  message?: string;
  blueprintSectionCount?: number;
  draftThemeId?: string | null;
  pipelineMode?: "queued" | "sync";
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const productIds =
    url.searchParams
      .get("ids")
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [];

  if (productIds.length === 0) {
    throw redirect("/app");
  }

  return {
    productIds,
    shop: session.shop,
    projectApiUrl: clientProjectApiBase(),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return Response.json(
      { success: false, error: "Method not allowed" } satisfies StylesActionResponse,
      { status: 405 },
    );
  }

  const formData = await request.formData();
  const selectedStyle = String(formData.get("selectedStyle") ?? "");
  const productIds = formData
    .getAll("productIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!selectedStyle) {
    return Response.json(
      { success: false, error: "Select a style preset first." } satisfies StylesActionResponse,
      { status: 400 },
    );
  }

  if (productIds.length === 0) {
    return Response.json(
      { success: false, error: "No products selected." } satisfies StylesActionResponse,
      { status: 400 },
    );
  }

  const apiBase = process.env.PROJECT_API_URL || "http://localhost:3001";

  try {
    const apiResponse = await fetch(`${apiBase}/api/projects/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productIds,
        stylePreset: selectedStyle,
        shop: session.shop,
        accessToken: session.accessToken,
      }),
    });

    const payload = (await apiResponse.json()) as {
      projectId?: string;
      message?: string;
      draftThemeId?: string | null;
      blueprintSectionCount?: number;
      pipelineMode?: "queued" | "sync";
      errors?: unknown;
    };

    if (!apiResponse.ok) {
      const apiMessage =
        typeof payload.message === "string"
          ? payload.message
          : typeof (payload as { error?: string }).error === "string"
            ? (payload as { error: string }).error
            : `API error (${apiResponse.status})`;

      return Response.json(
        { success: false, error: apiMessage } satisfies StylesActionResponse,
        { status: apiResponse.status },
      );
    }

    if (payload.projectId && payload.pipelineMode !== "queued") {
      const runResponse = await fetch(
        `${apiBase}/api/projects/run/${payload.projectId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shop-domain": session.shop,
          },
          body: JSON.stringify({ shop: session.shop }),
        },
      );

      const runPayload = (await runResponse.json()) as {
        message?: string;
        status?: string;
      };

      if (!runResponse.ok) {
        return Response.json(
          {
            success: false,
            error:
              runPayload.message ??
              `Pipeline failed to start (${runResponse.status})`,
          } satisfies StylesActionResponse,
          { status: runResponse.status },
        );
      }
    }

    return Response.json({
      success: true,
      projectId: payload.projectId,
      message:
        (payload.message ?? "Project created.") +
        " AI generation is running — watch progress below.",
      pipelineMode: payload.pipelineMode ?? "sync",
    } satisfies StylesActionResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach project API";

    return Response.json(
      { success: false, error: message } satisfies StylesActionResponse,
      { status: 502 },
    );
  }
};

export default function StylesPage() {
  const { productIds, shop, projectApiUrl } = useLoaderData<typeof loader>();

  const productCountLabel = `Pick a theme direction for your ${productIds.length} selected product${productIds.length === 1 ? "" : "s"}.`;

  return (
    <s-page heading="Choose your style">
      <s-section heading="Style presets">
        <StylePresetGrid
          productIds={productIds}
          productCountLabel={productCountLabel}
          shop={shop}
          projectApiUrl={projectApiUrl}
        />
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
