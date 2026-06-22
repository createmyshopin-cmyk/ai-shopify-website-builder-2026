/**
 * Proxy route for the Platform Layer /themes/* API endpoints.
 * Mirrors the pattern of app.api.projects.$.tsx but routes to /themes/*.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

function backendBase(): string {
  return process.env.PROJECT_API_URL || "http://localhost:3001";
}

async function handle({ request, params }: LoaderFunctionArgs | ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const splat = params["*"];
  const url = new URL(request.url);

  const path = splat ? `/themes/${splat}` : "/themes";
  const target = `${backendBase()}${path}${url.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  // Pass shop identity for JWT bypass in dev mode
  headers.set("x-shop", session.shop);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const response = await fetch(target, init);
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export const loader = handle;
export const action = handle;
