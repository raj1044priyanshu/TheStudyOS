export const dynamic = "force-dynamic";

import {
  RESOLVED_BUG_FEEDBACK_STATUS,
  RESOLVED_ERROR_STATUS,
  UNRESOLVED_BUG_FEEDBACK_STATUSES,
  UNRESOLVED_ERROR_STATUSES
} from "@/lib/admin/issues";
import { buildAdminErrorCenterFilters, mergeMongoFilters, normalizeAdminErrorCenterFilters } from "@/lib/admin/error-center";
import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { FeedbackModel } from "@/models/Feedback";

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-errors-list"
    });
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const filters = normalizeAdminErrorCenterFilters({
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "",
      errorSeverity: searchParams.get("errorSeverity") ?? searchParams.get("severity") ?? "",
      source: searchParams.get("source") ?? "",
      priority: searchParams.get("priority") ?? "",
      userId: searchParams.get("userId") ?? "",
      reportType: searchParams.get("reportType") ?? "",
      bugSeverity: searchParams.get("bugSeverity") ?? "",
      area: searchParams.get("area") ?? "",
      reproducibility: searchParams.get("reproducibility") ?? "",
      tester: searchParams.get("tester") ?? "",
      environment: searchParams.get("environment") ?? ""
    });
    const { errorFilter, bugFeedbackFilter, includeErrors, includeBugFeedback } = buildAdminErrorCenterFilters(filters);

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
      includeErrors ? AppErrorLogModel.find(errorFilter).sort({ lastSeenAt: -1 }).limit(200).lean() : Promise.resolve([]),
      includeBugFeedback
        ? FeedbackModel.find(bugFeedbackFilter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(200)
            .lean()
        : Promise.resolve([]),
      includeErrors ? AppErrorLogModel.countDocuments(errorFilter) : Promise.resolve(0),
      includeBugFeedback ? FeedbackModel.countDocuments(bugFeedbackFilter) : Promise.resolve(0),
      includeErrors
        ? AppErrorLogModel.countDocuments(mergeMongoFilters(errorFilter, { status: { $in: UNRESOLVED_ERROR_STATUSES } }))
        : Promise.resolve(0),
      includeBugFeedback
        ? FeedbackModel.countDocuments(mergeMongoFilters(bugFeedbackFilter, { status: { $in: UNRESOLVED_BUG_FEEDBACK_STATUSES } }))
        : Promise.resolve(0),
      includeErrors
        ? AppErrorLogModel.countDocuments(mergeMongoFilters(errorFilter, { status: RESOLVED_ERROR_STATUS }))
        : Promise.resolve(0),
      includeBugFeedback
        ? FeedbackModel.countDocuments(mergeMongoFilters(bugFeedbackFilter, { status: RESOLVED_BUG_FEEDBACK_STATUS }))
        : Promise.resolve(0)
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
