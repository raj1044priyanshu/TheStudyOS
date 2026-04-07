import { mapSharedIssueStatusToBugFeedbackStatuses, mapSharedIssueStatusToErrorStatuses } from "@/lib/admin/issues";
import { buildRegexSearchFilter } from "@/lib/admin/query";

export interface AdminErrorCenterFilters {
  q: string;
  status: string;
  errorSeverity: string;
  source: string;
  priority: string;
  userId: string;
  reportType: string;
  bugSeverity: string;
  area: string;
  reproducibility: string;
  tester: string;
  environment: string;
}

export function mergeMongoFilters(...filters: Array<Record<string, unknown> | null | undefined>): Record<string, unknown> {
  const active = filters.filter((filter) => filter && Object.keys(filter).length > 0) as Record<string, unknown>[];
  if (!active.length) {
    return {};
  }

  if (active.length === 1) {
    return active[0];
  }

  return {
    $and: active
  };
}

export function normalizeAdminErrorCenterFilters(
  filters: Partial<AdminErrorCenterFilters> & { severity?: string } | null | undefined
): AdminErrorCenterFilters {
  return {
    q: filters?.q ?? "",
    status: filters?.status ?? "",
    errorSeverity: filters?.errorSeverity ?? filters?.severity ?? "",
    source: filters?.source ?? "",
    priority: filters?.priority ?? "",
    userId: filters?.userId ?? "",
    reportType: filters?.reportType ?? "",
    bugSeverity: filters?.bugSeverity ?? "",
    area: filters?.area ?? "",
    reproducibility: filters?.reproducibility ?? "",
    tester: filters?.tester ?? "",
    environment: filters?.environment ?? ""
  };
}

export function buildAdminErrorCenterFilters(filters: AdminErrorCenterFilters) {
  const errorStatuses = mapSharedIssueStatusToErrorStatuses(filters.status);
  const bugFeedbackStatuses = mapSharedIssueStatusToBugFeedbackStatuses(filters.status);

  let includeErrors = !filters.reportType || filters.reportType === "runtime_error";
  let includeBugFeedback = !filters.reportType || filters.reportType === "feedback_bug" || filters.reportType === "tester_bug";

  const errorFilter = mergeMongoFilters(buildRegexSearchFilter(["message", "route", "url", "fingerprint", "userEmail"], filters.q));
  const bugFeedbackFilter = mergeMongoFilters(
    { category: "bug" },
    buildRegexSearchFilter(
      ["title", "message", "pageUrl", "email", "name", "adminNotes", "stepsToReproduce", "expectedBehavior", "actualBehavior", "workaround"],
      filters.q
    ),
    buildRegexSearchFilter(["name", "email"], filters.tester)
  );

  if (filters.status) {
    if (!errorStatuses.length) {
      includeErrors = false;
    } else {
      errorFilter.status = errorStatuses.length === 1 ? errorStatuses[0] : { $in: errorStatuses };
    }

    if (!bugFeedbackStatuses.length) {
      includeBugFeedback = false;
    } else {
      bugFeedbackFilter.status = bugFeedbackStatuses.length === 1 ? bugFeedbackStatuses[0] : { $in: bugFeedbackStatuses };
    }
  }

  if (filters.errorSeverity) {
    errorFilter.severity = filters.errorSeverity;
  }

  if (filters.source) {
    errorFilter.source = filters.source;
  }

  if (filters.priority) {
    bugFeedbackFilter.priority = filters.priority;
  }

  if (filters.reportType === "feedback_bug") {
    bugFeedbackFilter.$or = [{ reportType: "feedback" }, { reportType: { $exists: false } }];
  }

  if (filters.reportType === "tester_bug") {
    bugFeedbackFilter.reportType = "tester_bug";
  }

  if (filters.bugSeverity) {
    bugFeedbackFilter.severity = filters.bugSeverity;
  }

  if (filters.area) {
    bugFeedbackFilter.area = filters.area;
  }

  if (filters.reproducibility) {
    bugFeedbackFilter.reproducibility = filters.reproducibility;
  }

  if (filters.environment) {
    bugFeedbackFilter.environment = filters.environment;
  }

  if (filters.userId) {
    errorFilter.affectedUserIds = filters.userId;
    bugFeedbackFilter.userId = filters.userId;
  }

  return { errorFilter, bugFeedbackFilter, includeErrors, includeBugFeedback };
}
