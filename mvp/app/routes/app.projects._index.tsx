import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { getPresetLabel, isStylePresetId } from "@theme-editor/shared";

import { AppRouteLink } from "~/components/AppRouteLink";

import { Badge } from "~/components/ui/badge";
import { cn, formatRelativeTime } from "~/lib/utils";
import { fetchProjectList } from "~/services/projects.server";
import { authenticate } from "../shopify.server";

function projectStatusBadge(project: {
  status: string;
  ready: boolean;
}) {
  if (project.ready) {
    return <Badge variant="success">Ready to preview</Badge>;
  }
  if (project.status === "APPLIED") {
    return <Badge variant="success">Applied</Badge>;
  }
  if (project.status === "AGENTS_FAILED") {
    return (
      <Badge variant="outline" className="border-red-200 text-red-700">
        Failed
      </Badge>
    );
  }
  if (project.status === "AGENTS_RUNNING") {
    return <Badge variant="warning">Generating</Badge>;
  }
  return <Badge variant="secondary">In progress</Badge>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const projects = await fetchProjectList(session.shop);

  return {
    shop: session.shop,
    projects: projects.projects,
    projectApiUrl: process.env.PROJECT_API_URL || "http://localhost:3001",
  };
};

export default function ProjectsIndexPage() {
  const { projects } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <s-page heading="Design projects">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => navigate("/app")}
      >
        New project
      </s-button>

      <s-section heading="Your projects">
        <s-paragraph>
          Track AI theme generation runs and open previews when validation
          completes.
        </s-paragraph>

        {projects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-4xl" aria-hidden>
              ✨
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              No projects yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Select 1–5 products, pick a style preset, and create your first
              AI-generated landing page.
            </p>
            <div className="mt-6">
              <AppRouteLink
                to="/app"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start a new project
              </AppRouteLink>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Style</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Preview</th>
                  <th className="px-4 py-3 font-medium">Studio</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {projects.map((project) => (
                  <tr
                    key={project.projectId}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {isStylePresetId(project.stylePreset)
                        ? getPresetLabel(project.stylePreset)
                        : project.stylePreset}
                    </td>
                    <td className="px-4 py-3">
                      {projectStatusBadge(project)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.productCount}
                    </td>
                    <td className="px-4 py-3">
                      <AppRouteLink
                        to={`/app/projects/${project.projectId}/preview`}
                        className={cn(
                          "font-medium underline-offset-2 hover:underline",
                          project.ready
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {project.ready ? "Open preview" : "View progress"}
                      </AppRouteLink>
                    </td>
                    <td className="px-4 py-3">
                      <AppRouteLink
                        to={`/app/studio/${project.projectId}`}
                        className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                      >
                        Theme Studio
                      </AppRouteLink>
                    </td>
                    <td
                      className="px-4 py-3 text-muted-foreground"
                      title={new Date(project.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(project.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : "Failed to load design projects.";

  return (
    <s-page heading="Projects error">
      <s-banner tone="critical">{message}</s-banner>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
