import { authenticate } from "../shopify.server";

function backendBase(): string {
  return process.env.PROJECT_API_URL || "http://localhost:3001";
}

/** Browser-safe base — same-origin proxy under /app/api/projects */
export function clientProjectApiBase(): string {
  return "/app";
}

export async function proxyProjectApiRequest(
  request: Request,
  splat: string | undefined,
): Promise<Response> {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const path = splat ? `/api/projects/${splat}` : "/api/projects";
  const target = `${backendBase()}${path}${url.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  headers.set("x-shop-domain", session.shop);

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const response = await fetch(target, init);
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
