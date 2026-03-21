"use client";

import type { AppErrorSeverity, AppErrorSource } from "@/types";

interface ClientErrorPayload {
  source: Exclude<AppErrorSource, "server">;
  severity?: AppErrorSeverity;
  message: string;
  stack?: string;
  digest?: string;
  url?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

const recentReports = new Map<string, number>();

function canSendReport(key: string) {
  const now = Date.now();
  const previous = recentReports.get(key) ?? 0;
  if (now - previous < 10_000) {
    return false;
  }

  recentReports.set(key, now);
  return true;
}

export function reportClientError(payload: ClientErrorPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const key = `${payload.source}:${payload.message}:${payload.digest ?? ""}`;
  if (!canSendReport(key)) {
    return;
  }

  const body = JSON.stringify({
    source: payload.source,
    severity: payload.severity ?? (payload.source === "render" ? "fatal" : "error"),
    message: payload.message,
    stack: payload.stack ?? "",
    digest: payload.digest ?? "",
    url: payload.url ?? window.location.href,
    route: payload.route ?? window.location.pathname,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    metadata: payload.metadata ?? {}
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/errors/client", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch("/api/errors/client", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
    keepalive: true
  }).catch(() => {
    // Avoid recursive reporting if the logger endpoint is unavailable.
  });
}

export function getClientErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? ""
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      stack: ""
    };
  }

  return {
    message: "Unknown client-side error",
    stack: ""
  };
}
