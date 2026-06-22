import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";

import tailwindStylesheet from "./tailwind.css?url";

export const links = () => [{ rel: "stylesheet", href: tailwindStylesheet }];

export function HydrateFallback() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
          }}
        >
          <p>Loading app…</p>
        </main>
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let title = "Application error";
  let message = "Something went wrong while loading the app.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message =
      typeof error.data === "string"
        ? error.data
        : "The server returned an unexpected response.";
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <main
          style={{
            fontFamily:
              "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            margin: "0 auto",
            maxWidth: "42rem",
            padding: "2rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            {title}
          </h1>
          <p style={{ color: "#4b5563", lineHeight: 1.6 }}>{message}</p>
        </main>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
