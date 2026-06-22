import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { AppRouteLink } from "~/components/AppRouteLink";
import { ClientOnly } from "~/components/ClientOnly";
import { PreviewDashboard } from "~/components/PreviewDashboard";
import { fetchProjectPreview } from "~/services/projects.server";
import { clientProjectApiBase } from "~/services/project-api-proxy.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const projectId = params.projectId;

  if (!projectId) {
    throw new Response("Project id required", { status: 400 });
  }

  try {
    const preview = await fetchProjectPreview(session.shop, projectId);

    return {
      shop: session.shop,
      projectId,
      preview,
      projectApiUrl: clientProjectApiBase(),
      loadError: null as string | null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load project preview";

    return {
      shop: session.shop,
      projectId,
      preview: null,
      projectApiUrl: clientProjectApiBase(),
      loadError: message,
    };
  }
};

export default function ProjectPreviewPage() {
  const { shop, projectId, preview, projectApiUrl, loadError } =
    useLoaderData<typeof loader>();

  if (loadError || !preview) {
    return (
      <s-page heading="Theme preview">
        <s-banner tone="critical">
          {loadError ?? "Could not load preview for this project."}
        </s-banner>
        <AppRouteLink
          to="/app/projects"
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Back to projects
        </AppRouteLink>
      </s-page>
    );
  }

  return (
    <s-page heading="Theme preview">
      <s-link slot="breadcrumb-actions" href="/app/projects">
        All projects
      </s-link>

      <s-section heading={`Project ${projectId.slice(0, 8)}…`}>
        <ClientOnly
          fallback={
            <s-banner tone="info">Loading preview dashboard…</s-banner>
          }
        >
          <PreviewDashboard
            projectId={projectId}
            shop={shop}
            apiBase={projectApiUrl}
            initialPreview={preview}
          />
        </ClientOnly>
      </s-section>

      <s-section slot="aside" heading="Preview safety">
        <s-paragraph>
          Edits, AI chat, and apply update the draft preview first. Use Approve
          &amp; apply below only when ready — your live theme is unchanged until
          then.
        </s-paragraph>
        <AppRouteLink
          to="/app/projects"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Back to project list
        </AppRouteLink>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error ? error.message : "Failed to load preview.";

  return (
    <s-page heading="Preview error">
      <s-banner tone="critical">{message}</s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
