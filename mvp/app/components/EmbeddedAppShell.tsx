import type { ReactNode } from "react";

import { ClientErrorBoundary } from "./ClientErrorBoundary";

interface EmbeddedAppShellProps {
  children: ReactNode;
}

/**
 * Safe rendering shell for hybrid UI inside the embedded admin iframe:
 * Polaris web components for native chrome plus custom React islands.
 */
export function EmbeddedAppShell({ children }: EmbeddedAppShellProps) {
  return (
    <ClientErrorBoundary>
      <div className="embedded-app-shell min-h-0 w-full">{children}</div>
    </ClientErrorBoundary>
  );
}
