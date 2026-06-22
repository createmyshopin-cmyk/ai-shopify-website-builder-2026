import {
  ProjectListResponseSchema,
  ProjectPreviewResponseSchema,
  type ProjectListResponse,
  type ProjectPreviewResponse,
} from "@theme-editor/shared";

function apiBase(): string {
  return process.env.PROJECT_API_URL || "http://localhost:3001";
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  return payload;
}

export async function fetchProjectList(
  shop: string,
): Promise<ProjectListResponse> {
  const response = await fetch(`${apiBase()}/api/projects`, {
    headers: { "x-shop-domain": shop },
  });

  if (!response.ok) {
    throw new Error(`Project list failed (${response.status})`);
  }

  return ProjectListResponseSchema.parse(await parseJson(response));
}

export async function fetchProjectPreview(
  shop: string,
  projectId: string,
): Promise<ProjectPreviewResponse> {
  const response = await fetch(`${apiBase()}/api/projects/preview/${projectId}`, {
    headers: { "x-shop-domain": shop },
  });

  if (!response.ok) {
    throw new Error(`Project preview failed (${response.status})`);
  }

  return ProjectPreviewResponseSchema.parse(await parseJson(response));
}
