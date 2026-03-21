import { mapSharedIssueStatusToBugFeedbackStatuses, mapSharedIssueStatusToErrorStatuses } from "@/lib/admin/issues";
import { buildRegexSearchFilter } from "@/lib/admin/query";

export interface AdminErrorCenterFilters {
  q: string;
  status: string;
  severity: string;
  source: string;
  priority: string;
  userId: string;
}

export function normalizeAdminErrorCenterFilters(
  filters: Partial<AdminErrorCenterFilters> | null | undefined
): AdminErrorCenterFilters {
  return {
    q: filters?.q ?? "",
    status: filters?.status ?? "",
    severity: filters?.severity ?? "",
    source: filters?.source ?? "",
    priority: filters?.priority ?? "",
    userId: filters?.userId ?? ""
  };
}

export function buildAdminErrorCenterFilters(filters: AdminErrorCenterFilters) {
  const errorStatuses = mapSharedIssueStatusToErrorStatuses(filters.status);
  const bugFeedbackStatuses = mapSharedIssueStatusToBugFeedbackStatuses(filters.status);

  const errorFilter: Record<string, unknown> = {
    ...buildRegexSearchFilter(["message", "route", "url", "fingerprint", "userEmail"], filters.q)
  };
  const bugFeedbackFilter: Record<string, unknown> = {
    category: "bug",
    ...buildRegexSearchFilter(["message", "pageUrl", "email", "name", "adminNotes"], filters.q)
  };

  if (errorStatuses.length === 1) {
    errorFilter.status = errorStatuses[0];
  }

  if (bugFeedbackStatuses.length === 1) {
    bugFeedbackFilter.status = bugFeedbackStatuses[0];
  }

  if (filters.severity) {
    errorFilter.severity = filters.severity;
  }

  if (filters.source) {
    errorFilter.source = filters.source;
  }

  if (filters.priority) {
    bugFeedbackFilter.priority = filters.priority;
  }

  if (filters.userId) {
    errorFilter.affectedUserIds = filters.userId;
    bugFeedbackFilter.userId = filters.userId;
  }

  return { errorFilter, bugFeedbackFilter };
}
