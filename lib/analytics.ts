"use client";

import { sendGAEvent } from "@next/third-parties/google";

export const SIGN_IN_PENDING_KEY = "studyos:sign-in-pending";

type AnalyticsEventMap = {
  cta_click: {
    location: string;
    label: string;
    destination?: string;
  };
  sign_in_click: {
    provider: "google";
    destination: string;
  };
  sign_in_success: {
    destination: string;
  };
  onboarding_complete: {
    mode: "guided" | "auto-setup" | "skipped";
  };
  note_generated: {
    subject: string;
    className: string;
    detailLevel: string;
    style: string;
  };
  quiz_generated: {
    subject: string;
    difficulty: string;
    questionCount: number;
    source: "manual" | "planner" | "retake";
  };
  quiz_completed: {
    subject: string;
    totalQuestions: number;
    scoreBand: "low" | "mid" | "high";
  };
  study_plan_created: {
    examCount: number;
    focusTopicCount: number;
    hoursPerDay: number;
  };
  study_session_completed: {
    subject: string;
    duration: number;
    completed: boolean;
    sound: string;
  };
  feedback_submitted: {
    source: string;
    category: string;
    rating: number;
  };
};

type AnalyticsEventName = keyof AnalyticsEventMap;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function analyticsReady() {
  return Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) && typeof window !== "undefined" && typeof window.gtag === "function";
}

export function markPendingSignIn(destination: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SIGN_IN_PENDING_KEY, destination);
}

export function trackEvent<EventName extends AnalyticsEventName>(eventName: EventName, params: AnalyticsEventMap[EventName]) {
  if (!analyticsReady()) {
    return;
  }

  const cleanedParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
  sendGAEvent("event", eventName, cleanedParams);
}
