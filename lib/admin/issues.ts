import type { AdminIssueSummary } from "@/types";

export const UNRESOLVED_ERROR_STATUSES = ["open", "acknowledged"] as const;
export const UNRESOLVED_BUG_FEEDBACK_STATUSES = ["open", "in_review", "needs_retest"] as const;
export const RESOLVED_ERROR_STATUS = "resolved" as const;
export const RESOLVED_BUG_FEEDBACK_STATUS = "resolved" as const;

type ErrorLogLike = {
  _id: { toString(): string } | string;
  message: string;
  status: string;
  severity: string;
  route?: string | null;
  url?: string | null;
  source?: string | null;
  userId?: { toString(): string } | string | null;
  userEmail?: string | null;
  lastSeenAt?: Date | string | null;
};

type BugFeedbackLike = {
  _id: { toString(): string } | string;
  title?: string | null;
  message: string;
  status: string;
  priority: string;
  pageUrl?: string | null;
  area?: string | null;
  reportType?: string | null;
  userId?: { toString(): string } | string | null;
  email?: string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

function toId(value: { toString(): string } | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toString();
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function normalizeErrorLogIssue(item: ErrorLogLike): AdminIssueSummary {
  return {
    kind: "error_log",
    id: toId(item._id) ?? "",
    title: item.message,
    status: item.status as AdminIssueSummary["status"],
    severityOrPriority: item.severity,
    location: item.route || item.url || item.source || "Unknown surface",
    userId: toId(item.userId),
    userEmail: item.userEmail ?? "",
    updatedAt: toIsoDate(item.lastSeenAt)
  };
}

export function normalizeBugFeedbackIssue(item: BugFeedbackLike): AdminIssueSummary {
  const location = item.pageUrl || item.area || (item.reportType === "tester_bug" ? "Tester bug report" : "Landing page feedback");

  return {
    kind: "bug_feedback",
    id: toId(item._id) ?? "",
    title: item.title || item.message,
    status: item.status as AdminIssueSummary["status"],
    severityOrPriority: item.priority,
    location,
    userId: toId(item.userId),
    userEmail: item.email ?? "",
    updatedAt: toIsoDate(item.updatedAt ?? item.createdAt)
  };
}

export function sortAdminIssuesByUpdatedAt(items: AdminIssueSummary[]) {
  return [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function mapSharedIssueStatusToErrorStatuses(status: string) {
  switch (status) {
    case "open":
      return ["open"];
    case "in_review":
    case "acknowledged":
      return ["acknowledged"];
    case "resolved":
      return ["resolved"];
    case "ignored":
      return ["ignored"];
    default:
      return [];
  }
}

export function mapSharedIssueStatusToBugFeedbackStatuses(status: string) {
  switch (status) {
    case "open":
      return ["open"];
    case "in_review":
    case "acknowledged":
      return ["in_review"];
    case "needs_retest":
      return ["needs_retest"];
    case "resolved":
      return ["resolved"];
    case "ignored":
      return ["ignored"];
    default:
      return [];
  }
}
