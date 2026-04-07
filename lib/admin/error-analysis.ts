import { UNRESOLVED_BUG_FEEDBACK_STATUSES, UNRESOLVED_ERROR_STATUSES } from "@/lib/admin/issues";

type ErrorLike = {
  _id: { toString(): string } | string;
  message: string;
  status: string;
  severity: string;
  route?: string | null;
  url?: string | null;
  source?: string | null;
  occurrences?: number | null;
  lastSeenAt?: Date | string | null;
};

type BugFeedbackLike = {
  _id: { toString(): string } | string;
  title?: string | null;
  message: string;
  reportType?: string | null;
  area?: string | null;
  severity?: string | null;
  reproducibility?: string | null;
  status: string;
  priority: string;
  pageUrl?: string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export interface BugCenterAnalysisFinding {
  kind: "error_log" | "bug_feedback";
  id: string;
  title: string;
  status: string;
  severityOrPriority: string;
  location: string;
  updatedAt: string;
  score: number;
  reason: string;
}

export interface BugCenterAnalysisHotspot {
  location: string;
  totalItems: number;
  errorCount: number;
  feedbackCount: number;
  latestSeenAt: string;
}

export interface BugCenterRecommendedAction {
  urgency: "critical" | "high" | "moderate";
  title: string;
  detail: string;
}

export interface BugCenterAnalysisResult {
  generatedAt: string;
  summary: {
    systemIssueCount: number;
    feedbackBugCount: number;
    activeSystemIssueCount: number;
    activeFeedbackBugCount: number;
    criticalSystemIssueCount: number;
    urgentFeedbackCount: number;
    highRiskFindingCount: number;
    hotspotCount: number;
  };
  findings: BugCenterAnalysisFinding[];
  hotspots: BugCenterAnalysisHotspot[];
  recommendedActions: BugCenterRecommendedAction[];
}

const ERROR_SEVERITY_SCORE: Record<string, number> = {
  info: 20,
  warning: 40,
  error: 75,
  fatal: 100
};

const BUG_PRIORITY_SCORE: Record<string, number> = {
  low: 20,
  medium: 45,
  high: 75,
  urgent: 100
};

function toId(value: { toString(): string } | string) {
  return typeof value === "string" ? value : value.toString();
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function buildRecencyBoost(dateValue: string) {
  const ageMs = Date.now() - new Date(dateValue).getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (ageMs <= hour) {
    return 25;
  }

  if (ageMs <= day) {
    return 18;
  }

  if (ageMs <= 7 * day) {
    return 10;
  }

  return 4;
}

function buildErrorFinding(item: ErrorLike): BugCenterAnalysisFinding {
  const updatedAt = toIsoDate(item.lastSeenAt);
  const severityScore = ERROR_SEVERITY_SCORE[item.severity] ?? 35;
  const occurrences = Math.max(1, Number(item.occurrences ?? 1));
  const score = severityScore + Math.min(occurrences, 20) * 2 + buildRecencyBoost(updatedAt);
  const location = item.route || item.url || item.source || "Unknown surface";
  const reasonParts = [`${item.severity} severity`, `${occurrences} occurrence${occurrences === 1 ? "" : "s"}`];

  if (item.status === "open") {
    reasonParts.push("still open");
  } else if (item.status === "acknowledged") {
    reasonParts.push("being reviewed");
  }

  return {
    kind: "error_log",
    id: toId(item._id),
    title: item.message,
    status: item.status,
    severityOrPriority: item.severity,
    location,
    updatedAt,
    score,
    reason: reasonParts.join(", ")
  };
}

function buildBugFinding(item: BugFeedbackLike): BugCenterAnalysisFinding {
  const updatedAt = toIsoDate(item.updatedAt ?? item.createdAt);
  const priorityScore = BUG_PRIORITY_SCORE[item.priority] ?? 35;
  const severityBoost =
    item.severity === "blocker"
      ? 18
      : item.severity === "critical"
        ? 12
        : item.severity === "major"
          ? 7
          : 3;
  const reproducibilityBoost = item.reproducibility === "always" ? 8 : item.reproducibility === "intermittent" ? 4 : 1;
  const score = priorityScore + severityBoost + reproducibilityBoost + buildRecencyBoost(updatedAt) + (item.status === "open" ? 15 : 8);
  const location = item.pageUrl || item.area || (item.reportType === "tester_bug" ? "Tester bug report" : "Landing page feedback");
  const reasonParts = [
    item.reportType === "tester_bug" ? "tester bug" : "feedback bug",
    `${item.priority} priority`,
    item.severity ? `${item.severity} severity` : null,
    item.reproducibility ? `${item.reproducibility} repro` : null,
    item.status === "open" ? "awaiting review" : item.status === "needs_retest" ? "awaiting verification" : "currently in review"
  ].filter(Boolean) as string[];

  return {
    kind: "bug_feedback",
    id: toId(item._id),
    title: item.title || item.message,
    status: item.status,
    severityOrPriority: item.severity || item.priority,
    location,
    updatedAt,
    score,
    reason: reasonParts.join(", ")
  };
}

export function buildBugCenterAnalysis({
  errorItems,
  bugFeedbackItems
}: {
  errorItems: ErrorLike[];
  bugFeedbackItems: BugFeedbackLike[];
}): BugCenterAnalysisResult {
  const unresolvedErrorItems = errorItems.filter((item) =>
    UNRESOLVED_ERROR_STATUSES.includes(item.status as (typeof UNRESOLVED_ERROR_STATUSES)[number])
  );
  const unresolvedBugFeedbackItems = bugFeedbackItems.filter((item) =>
    UNRESOLVED_BUG_FEEDBACK_STATUSES.includes(item.status as (typeof UNRESOLVED_BUG_FEEDBACK_STATUSES)[number])
  );

  const findings = [
    ...unresolvedErrorItems.map((item) => buildErrorFinding(item)),
    ...unresolvedBugFeedbackItems.map((item) => buildBugFinding(item))
  ]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .slice(0, 8);

  const hotspotMap = new Map<
    string,
    {
      location: string;
      totalItems: number;
      errorCount: number;
      feedbackCount: number;
      latestSeenAt: string;
    }
  >();

  for (const item of unresolvedErrorItems) {
    const location = item.route || item.url || item.source || "Unknown surface";
    const updatedAt = toIsoDate(item.lastSeenAt);
    const existing = hotspotMap.get(location) ?? {
      location,
      totalItems: 0,
      errorCount: 0,
      feedbackCount: 0,
      latestSeenAt: updatedAt
    };

    existing.totalItems += 1;
    existing.errorCount += 1;
    if (new Date(updatedAt).getTime() > new Date(existing.latestSeenAt).getTime()) {
      existing.latestSeenAt = updatedAt;
    }
    hotspotMap.set(location, existing);
  }

  for (const item of unresolvedBugFeedbackItems) {
    const location = item.pageUrl || "Landing page feedback";
    const updatedAt = toIsoDate(item.updatedAt ?? item.createdAt);
    const existing = hotspotMap.get(location) ?? {
      location,
      totalItems: 0,
      errorCount: 0,
      feedbackCount: 0,
      latestSeenAt: updatedAt
    };

    existing.totalItems += 1;
    existing.feedbackCount += 1;
    if (new Date(updatedAt).getTime() > new Date(existing.latestSeenAt).getTime()) {
      existing.latestSeenAt = updatedAt;
    }
    hotspotMap.set(location, existing);
  }

  const hotspots = [...hotspotMap.values()]
    .sort((left, right) => {
      if (right.totalItems !== left.totalItems) {
        return right.totalItems - left.totalItems;
      }

      return new Date(right.latestSeenAt).getTime() - new Date(left.latestSeenAt).getTime();
    })
    .slice(0, 6);

  const criticalSystemIssueCount = unresolvedErrorItems.filter((item) => item.severity === "fatal" || item.severity === "error").length;
  const urgentFeedbackCount = unresolvedBugFeedbackItems.filter((item) => item.priority === "urgent" || item.priority === "high").length;
  const recommendedActions: BugCenterRecommendedAction[] = [];

  if (!unresolvedErrorItems.length && !unresolvedBugFeedbackItems.length) {
    recommendedActions.push({
      urgency: "moderate",
      title: "No active issues in this scope",
      detail: "The current filters do not contain any unresolved runtime errors or reported bug issues."
    });
  } else {
    if (criticalSystemIssueCount > 0) {
      recommendedActions.push({
        urgency: "critical",
        title: `Stabilize ${criticalSystemIssueCount} active system issue${criticalSystemIssueCount === 1 ? "" : "s"}`,
        detail: "Fatal and error-level runtime groups are still unresolved and should be addressed before lower-priority cleanup."
      });
    }

    if (urgentFeedbackCount > 0) {
      recommendedActions.push({
        urgency: "high",
        title: `Review ${urgentFeedbackCount} high-priority reported bug${urgentFeedbackCount === 1 ? "" : "s"}`,
        detail: "Feedback and tester bug reports are still marked high or urgent priority and should be triaged alongside runtime failures."
      });
    }

    if (hotspots[0]?.totalItems > 1) {
      recommendedActions.push({
        urgency: "high",
        title: `Focus on hotspot: ${hotspots[0].location}`,
        detail: `${hotspots[0].totalItems} active issues are concentrated here, making it the fastest place to reduce visible breakage.`
      });
    }

    if (recommendedActions.length < 3) {
      recommendedActions.push({
        urgency: "moderate",
        title: "Keep analysis snapshots fresh",
        detail: "Run analysis again after changing statuses or filters so the priority queue stays aligned with the latest issue state."
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      systemIssueCount: errorItems.length,
      feedbackBugCount: bugFeedbackItems.length,
      activeSystemIssueCount: unresolvedErrorItems.length,
      activeFeedbackBugCount: unresolvedBugFeedbackItems.length,
      criticalSystemIssueCount,
      urgentFeedbackCount,
      highRiskFindingCount: findings.filter((item) => item.score >= 95).length,
      hotspotCount: hotspots.length
    },
    findings,
    hotspots,
    recommendedActions
  };
}
