"use client";

import { useEffect } from "react";
import { getClientErrorMessage, reportClientError } from "@/lib/client-error-report";

interface Props {
  children: React.ReactNode;
}

export function ErrorReporterProvider({ children }: Props) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const fallback = getClientErrorMessage(event.error ?? event.message);
      reportClientError({
        source: "client",
        severity: "error",
        message: fallback.message,
        stack: fallback.stack,
        metadata: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const fallback = getClientErrorMessage(event.reason);
      reportClientError({
        source: "unhandled_rejection",
        severity: "error",
        message: fallback.message,
        stack: fallback.stack,
        metadata: {
          reasonType: typeof event.reason
        }
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return children;
}
