"use client";

import { useEffect, useRef } from "react";

const SAMPLE_INTERVAL_MS = 15_000;
const IDLE_TIMEOUT_MS = 60_000;
const FLUSH_THRESHOLD_SECONDS = 15;

export function ActiveStudyTracker() {
  const pendingSecondsRef = useRef(0);
  const lastSampleAtRef = useRef<number | null>(null);
  const lastInteractionAtRef = useRef<number>(Date.now());
  const flushInFlightRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    lastSampleAtRef.current = now;
    lastInteractionAtRef.current = now;

    function markInteraction() {
      lastInteractionAtRef.current = Date.now();
      if (lastSampleAtRef.current === null) {
        lastSampleAtRef.current = lastInteractionAtRef.current;
      }
    }

    function captureActiveSeconds() {
      const nowTime = Date.now();
      const previous = lastSampleAtRef.current ?? nowTime;
      lastSampleAtRef.current = nowTime;

      if (document.visibilityState !== "visible") {
        return;
      }

      if (nowTime - lastInteractionAtRef.current > IDLE_TIMEOUT_MS) {
        return;
      }

      const deltaSeconds = Math.max(0, Math.min(30, Math.floor((nowTime - previous) / 1000)));
      pendingSecondsRef.current += deltaSeconds;
    }

    async function flushPending(options?: { force?: boolean; useBeacon?: boolean }) {
      if (flushInFlightRef.current) {
        return;
      }

      captureActiveSeconds();

      const seconds = pendingSecondsRef.current;
      if (!seconds) {
        return;
      }

      if (!options?.force && seconds < FLUSH_THRESHOLD_SECONDS) {
        return;
      }

      const payload = JSON.stringify({ seconds });

      if (options?.useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const sent = navigator.sendBeacon("/api/progress/time", new Blob([payload], { type: "application/json" }));
        if (sent) {
          pendingSecondsRef.current = 0;
          return;
        }
      }

      flushInFlightRef.current = true;
      pendingSecondsRef.current = 0;

      try {
        const response = await fetch("/api/progress/time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: options?.useBeacon
        });

        if (!response.ok) {
          pendingSecondsRef.current += seconds;
          return;
        }

        const data = (await response.json().catch(() => null)) as
          | {
              trackedSeconds?: number;
              todayMinutes?: number;
              studyMinutesWeek?: number;
              totalMinutes?: number;
              dailyMinutes?: Array<{ dayKey: string; minutes: number }>;
            }
          | null;

        window.dispatchEvent(
          new CustomEvent("studyos:active-time-updated", {
            detail: data
          })
        );
      } catch {
        pendingSecondsRef.current += seconds;
      } finally {
        flushInFlightRef.current = false;
      }
    }

    const interval = window.setInterval(() => {
      void flushPending();
    }, SAMPLE_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushPending({ force: true, useBeacon: true });
      } else {
        lastSampleAtRef.current = Date.now();
        markInteraction();
      }
    };

    const onBeforeUnload = () => {
      void flushPending({ force: true, useBeacon: true });
    };

    const activityEvents: Array<keyof WindowEventMap> = ["focus", "pointerdown", "keydown", "scroll", "mousemove", "touchstart"];

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markInteraction, { passive: true });
    });

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markInteraction);
      });
      void flushPending({ force: true, useBeacon: true });
    };
  }, []);

  return null;
}
