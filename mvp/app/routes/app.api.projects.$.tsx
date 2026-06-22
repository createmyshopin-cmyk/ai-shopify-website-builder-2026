import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { proxyProjectApiRequest } from "../services/project-api-proxy.server";

async function handle({ request, params }: LoaderFunctionArgs | ActionFunctionArgs) {
  return proxyProjectApiRequest(request, params["*"]);
}

export const loader = handle;
export const action = handle;
