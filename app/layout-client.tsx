/**
 * Client-side error handling wrapper
 *
 * Separated from layout.tsx to avoid "use client" affecting
 * server-side rendering of metadata.
 */

"use client";

import { useEffect } from "react";
import { logError } from "@/lib/errors/AppError";

export function ClientErrorWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Promise Rejection]:", event.reason);

      // Log error
      logError(event.reason, {
        location: "unhandledRejection",
      });

      // Prevent default error handling
      event.preventDefault();
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error("[Uncaught Error]:", event.error);

      // Log error
      logError(event.error, {
        location: "uncaughtError",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return <>{children}</>;
}
