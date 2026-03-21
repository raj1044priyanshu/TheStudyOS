export const dynamic = "force-dynamic";

import {
  RESOLVED_BUG_FEEDBACK_STATUS,
  RESOLVED_ERROR_STATUS,
  UNRESOLVED_BUG_FEEDBACK_STATUSES,
  UNRESOLVED_ERROR_STATUSES
} from "@/lib/admin/issues";
import { buildAdminErrorCenterFilters, normalizeAdminErrorCenterFilters } from "@/lib/admin/error-center";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { FeedbackModel } from "@/models/Feedback";

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const filters = normalizeAdminErrorCenterFilters({
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "",
      severity: searchParams.get("severity") ?? "",
      source: searchParams.get("source") ?? "",
      priority: searchParams.get("priority") ?? "",
      userId: searchParams.get("userId") ?? ""
    });
    const { errorFilter, bugFeedbackFilter } = buildAdminErrorCenterFilters(filters);

    const [
      errorItems,
      bugFeedbackItems,
      runtimeErrorCount,
      bugFeedbackCount,
      unresolvedErrorCount,
      unresolvedBugFeedbackCount,
      resolvedErrorCount,
      resolvedBugFeedbackCount
    ] = await Promise.all([
      AppErrorLogModel.find(errorFilter).sort({ lastSeenAt: -1 }).limit(200).lean(),
      FeedbackModel.find(bugFeedbackFilter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(200)
        .lean(),
      AppErrorLogModel.countDocuments({}),
      FeedbackModel.countDocuments({ category: "bug" }),
      AppErrorLogModel.countDocuments({ status: { $in: UNRESOLVED_ERROR_STATUSES } }),
      FeedbackModel.countDocuments({ category: "bug", status: { $in: UNRESOLVED_BUG_FEEDBACK_STATUSES } }),
      AppErrorLogModel.countDocuments({ status: RESOLVED_ERROR_STATUS }),
      FeedbackModel.countDocuments({ category: "bug", status: RESOLVED_BUG_FEEDBACK_STATUS })
    ]);

    return Response.json({
      summary: {
        totalTrackedIssues: runtimeErrorCount + bugFeedbackCount,
        unresolvedIssues: unresolvedErrorCount + unresolvedBugFeedbackCount,
        resolvedIssues: resolvedErrorCount + resolvedBugFeedbackCount,
        runtimeErrorCount,
        bugFeedbackCount,
        unresolvedErrorCount,
        unresolvedBugFeedbackCount,
        resolvedErrorCount,
        resolvedBugFeedbackCount
      },
      errorItems: toSerializable(errorItems),
      bugFeedbackItems: toSerializable(bugFeedbackItems)
    });
  } catch (error) {
    return routeError("admin:errors:list", error);
  }
}
