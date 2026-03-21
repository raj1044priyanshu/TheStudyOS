export const dynamic = "force-dynamic";

import { buildBugCenterAnalysis } from "@/lib/admin/error-analysis";
import { buildAdminErrorCenterFilters, normalizeAdminErrorCenterFilters } from "@/lib/admin/error-center";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { FeedbackModel } from "@/models/Feedback";

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const payload = (await request.json().catch(() => null)) as Record<string, string> | null;
    const filters = normalizeAdminErrorCenterFilters(payload);
    const { errorFilter, bugFeedbackFilter } = buildAdminErrorCenterFilters(filters);

    const [errorItems, bugFeedbackItems] = await Promise.all([
      AppErrorLogModel.find(errorFilter)
        .sort({ lastSeenAt: -1 })
        .limit(500)
        .select("message status severity route url source occurrences lastSeenAt")
        .lean(),
      FeedbackModel.find(bugFeedbackFilter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(500)
        .select("message status priority pageUrl updatedAt createdAt")
        .lean()
    ]);

    return Response.json({
      analysis: toSerializable(
        buildBugCenterAnalysis({
          errorItems,
          bugFeedbackItems
        })
      ),
      filters
    });
  } catch (error) {
    return routeError("admin:errors:analyze", error);
  }
}
