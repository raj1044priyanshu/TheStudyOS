"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BACKGROUND_FETCH_HEADER } from "@/lib/client-network";

const SHOW_DELAY_MS = 140;
const COMPLETE_HIDE_DELAY_MS = 220;

function isInternalNavigableAnchor(target: EventTarget | null) {
  const element = target instanceof Element ? target.closest("a[href]") : null;
  if (!(element instanceof HTMLAnchorElement)) {
    return null;
  }

  if (element.target && element.target !== "_self") {
    return null;
  }

  if (element.hasAttribute("download")) {
    return null;
  }

  const href = element.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }

  try {
    const url = new URL(element.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function readHeaderValue(headers: Headers | null, key: string) {
  if (!headers) {
    return "";
  }

  return headers.get(key)?.trim() ?? "";
}

function isBackgroundRequest(input: RequestInfo | URL, init?: RequestInit) {
  const nextHeaders = init?.headers ? new Headers(init.headers) : null;
  if (readHeaderValue(nextHeaders, BACKGROUND_FETCH_HEADER) === "1") {
    return true;
  }

  if (input instanceof Request) {
    return readHeaderValue(input.headers, BACKGROUND_FETCH_HEADER) === "1";
  }

  return false;
}

export function GlobalLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const pendingFetchesRef = useRef(0);
  const routePendingRef = useRef(false);
  const showTimeoutRef = useRef<number | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const trickleIntervalRef = useRef<number | null>(null);

  const beginVisualLoading = useCallback(() => {
    if (showTimeoutRef.current !== null || visible) {
      return;
    }

    showTimeoutRef.current = window.setTimeout(() => {
      showTimeoutRef.current = null;
      setVisible(true);
      setProgress((current) => (current > 12 ? current : 12));
    }, SHOW_DELAY_MS);
  }, [visible]);

  const stopVisualLoading = useCallback(() => {
    if (showTimeoutRef.current !== null) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (!visible) {
      setProgress(0);
      return;
    }

    setProgress(100);
    if (completeTimeoutRef.current !== null) {
      window.clearTimeout(completeTimeoutRef.current);
    }
    completeTimeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, COMPLETE_HIDE_DELAY_MS);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      if (trickleIntervalRef.current !== null) {
        window.clearInterval(trickleIntervalRef.current);
        trickleIntervalRef.current = null;
      }
      return;
    }

    trickleIntervalRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }
        const increment = Math.max((95 - current) * 0.12, 2.4);
        return Math.min(92, current + increment);
      });
    }, 180);

    return () => {
      if (trickleIntervalRef.current !== null) {
        window.clearInterval(trickleIntervalRef.current);
        trickleIntervalRef.current = null;
      }
    };
  }, [visible]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const input = args[0];
      const init = args[1];
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : "";

      const isInternalRequest = !requestUrl || requestUrl.startsWith("/") || requestUrl.startsWith(window.location.origin);
      if (!isInternalRequest || isBackgroundRequest(input, init)) {
        return originalFetch(...args);
      }

      pendingFetchesRef.current += 1;
      beginVisualLoading();

      try {
        return await originalFetch(...args);
      } finally {
        pendingFetchesRef.current = Math.max(0, pendingFetchesRef.current - 1);
        if (pendingFetchesRef.current === 0 && !routePendingRef.current) {
          stopVisualLoading();
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [beginVisualLoading, stopVisualLoading]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const targetUrl = isInternalNavigableAnchor(event.target);
      if (!targetUrl) {
        return;
      }

      const nextKey = `${targetUrl.pathname}?${targetUrl.searchParams.toString()}`;
      if (nextKey === routeKey) {
        return;
      }

      routePendingRef.current = true;
      beginVisualLoading();
    };

    const handleStart = () => {
      pendingFetchesRef.current += 1;
      beginVisualLoading();
    };

    const handleStop = () => {
      pendingFetchesRef.current = Math.max(0, pendingFetchesRef.current - 1);
      if (pendingFetchesRef.current === 0 && !routePendingRef.current) {
        stopVisualLoading();
      }
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("studyos:loading-start", handleStart);
    window.addEventListener("studyos:loading-stop", handleStop);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("studyos:loading-start", handleStart);
      window.removeEventListener("studyos:loading-stop", handleStop);
    };
  }, [beginVisualLoading, routeKey, stopVisualLoading]);

  useEffect(() => {
    if (!routePendingRef.current) {
      return;
    }

    routePendingRef.current = false;
    if (pendingFetchesRef.current === 0) {
      stopVisualLoading();
    }
  }, [routeKey, stopVisualLoading]);

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current !== null) {
        window.clearTimeout(showTimeoutRef.current);
      }
      if (completeTimeoutRef.current !== null) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      if (trickleIntervalRef.current !== null) {
        window.clearInterval(trickleIntervalRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`studyos-loading-bar ${visible ? "studyos-loading-bar--visible" : ""}`}
      style={{ transform: `scaleX(${Math.min(progress, 100) / 100})` }}
    />
  );
}
