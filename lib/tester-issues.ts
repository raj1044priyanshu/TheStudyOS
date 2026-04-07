import type { FeedbackArea, FeedbackPriority, FeedbackReproducibility, FeedbackReportType, FeedbackSeverity } from "@/types";

export const FEEDBACK_REPORT_TYPES = ["feedback", "tester_bug"] as const satisfies readonly FeedbackReportType[];
export const TESTER_BUG_AREAS = [
  "auth",
  "dashboard",
  "notes",
  "planner",
  "quiz",
  "doubts",
  "progress",
  "admin",
  "other"
] as const satisfies readonly FeedbackArea[];
export const TESTER_BUG_SEVERITIES = ["minor", "major", "critical", "blocker"] as const satisfies readonly FeedbackSeverity[];
export const TESTER_BUG_REPRODUCIBILITY = ["always", "intermittent", "once"] as const satisfies readonly FeedbackReproducibility[];
export const TESTER_BUG_OPEN_STATUSES = ["open", "in_review", "needs_retest"] as const;

export function mapTesterSeverityToPriority(severity: FeedbackSeverity): FeedbackPriority {
  switch (severity) {
    case "blocker":
      return "urgent";
    case "critical":
      return "high";
    case "major":
      return "medium";
    default:
      return "low";
  }
}

export function inferRequestEnvironment(request: Request) {
  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  const host =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim() ||
    new URL(request.url).host.trim();
  const normalizedHost = host.toLowerCase();

  if (
    normalizedHost.startsWith("localhost") ||
    normalizedHost.startsWith("127.0.0.1") ||
    normalizedHost.startsWith("0.0.0.0") ||
    normalizedHost.endsWith(".local")
  ) {
    return "local";
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

export function isLegacyOrFeedbackReport(value: string | null | undefined) {
  return !value || value === "feedback";
}
