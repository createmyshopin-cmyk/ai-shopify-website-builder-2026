import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { EmbeddedAppShell } from "~/components/EmbeddedAppShell";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

function MissingApiKeyState() {
  return (
    <AppProvider embedded={false}>
      <s-page heading="App configuration required">
        <s-banner tone="critical">
          SHOPIFY_API_KEY is missing. Run `shopify app env pull` and restart
          `shopify app dev` so App Bridge can initialize inside the admin
          iframe.
        </s-banner>
      </s-page>
    </AppProvider>
  );
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  if (!apiKey) {
    return <MissingApiKeyState />;
  }

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Create</s-link>
        <s-link href="/app/projects">Projects</s-link>
      </s-app-nav>
      <EmbeddedAppShell>
        <Outlet />
      </EmbeddedAppShell>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
