import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import ErrorBoundary from "./ErrorBoundary";

export default function RouteErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  return (
    <ErrorBoundary
      key={location.key}
      homeLink={
        <Link className="button secondary" to="/">
          Về trang chủ
        </Link>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
