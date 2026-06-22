/**
 * Theme Studio Route — /app/studio/:projectId
 *
 * Full merchant flow:
 *   Generate → Preview → Edit Copy → Regenerate → Save Draft → Publish
 *
 * All API calls go through the /app/api/themes/* proxy (app.api.themes.$.tsx)
 * which routes to the Platform Layer ThemesController on the NestJS API.
 */
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ThemeStudio } from "../components/ThemeStudio";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const projectId = params.projectId;

  if (!projectId) {
    throw new Response("Project ID required", { status: 400 });
  }

  // Fetch current project status from the Platform Layer API
  try {
    const apiBase = process.env.PROJECT_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiBase}/themes/${projectId}`, {
      headers: { "x-shop": session.shop },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const projectStatus = (await response.json()) as {
      projectId: string;
      status: string;
      jobs: Array<{ type: string; status: string }>;
    };

    // Fetch version history
    const versionsResponse = await fetch(`${apiBase}/themes/${projectId}/versions`, {
      headers: { "x-shop": session.shop },
    });
    const { versions = [] } = versionsResponse.ok
      ? ((await versionsResponse.json()) as { versions: unknown[] })
      : { versions: [] };

    return {
      shop: session.shop,
      projectId,
      projectStatus,
      versions,
      apiProxyBase: "/app/api/themes",
      loadError: null as string | null,
    };
  } catch (error) {
    return {
      shop: session.shop,
      projectId,
      projectStatus: null,
      versions: [],
      apiProxyBase: "/app/api/themes",
      loadError: error instanceof Error ? error.message : "Failed to load project",
    };
  }
};

export default function ThemeStudioPage() {
  const { shop, projectId, projectStatus, versions, apiProxyBase, loadError } =
    useLoaderData<typeof loader>();

  if (loadError || !projectStatus) {
    return (
      <s-page heading="Theme Studio">
        <s-banner tone="critical">
          {loadError ?? "Could not load project."}
        </s-banner>
      </s-page>
    );
  }

  return (
    <s-page heading="Theme Studio">
      <s-link slot="breadcrumb-actions" href="/app/projects">
        All projects
      </s-link>
      <ThemeStudio
        projectId={projectId}
        shop={shop}
        projectStatus={projectStatus}
        versions={versions}
        apiBase={apiProxyBase}
      />
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <s-page heading="Theme Studio Error">
      <s-banner tone="critical">
        {error instanceof Error ? error.message : "An unexpected error occurred."}
      </s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
