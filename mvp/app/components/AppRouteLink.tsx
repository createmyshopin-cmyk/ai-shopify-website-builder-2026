import type { ReactNode } from "react";
import { useNavigate } from "react-router";

interface AppRouteLinkProps {
  to: string;
  className?: string;
  children: ReactNode;
}

/**
 * In embedded Shopify admin, React Router <Link> often does not navigate.
 * Use App Bridge–compatible navigation via useNavigate (same as s-link).
 */
export function AppRouteLink({ to, className, children }: AppRouteLinkProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={className}
      onClick={() => navigate(to)}
    >
      {children}
    </button>
  );
}
