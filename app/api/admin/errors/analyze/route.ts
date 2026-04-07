export const dynamic = "force-dynamic";

import { z } from "zod";
import { buildBugCenterAnalysis } from "@/lib/admin/error-analysis";
import { buildAdminErrorCenterFilters, normalizeAdminErrorCenterFilters } from "@/lib/admin/error-center";
import { buildValidationErrorResponse, requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { FeedbackModel } from "@/models/Feedback";

const filterSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  errorSeverity: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  userId: z.string().optional(),
  reportType: z.string().optional(),
  bugSeverity: z.string().optional(),
  area: z.string().optional(),
  reproducibility: z.string().optional(),
  tester: z.string().optional(),
  environment: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-errors-analyze"
    });
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const payload = filterSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return buildValidationErrorResponse(payload.error);
    }
    const filters = normalizeAdminErrorCenterFilters(payload.data);
    const { errorFilter, bugFeedbackFilter, includeErrors, includeBugFeedback } = buildAdminErrorCenterFilters(filters);

    const [errorItems, bugFeedbackItems] = await Promise.all([
      includeErrors
        ? AppErrorLogModel.find(errorFilter)
            .sort({ lastSeenAt: -1 })
            .limit(500)
            .select("message status severity route url source occurrences lastSeenAt")
            .lean()
        : Promise.resolve([]),
      includeBugFeedback
        ? FeedbackModel.find(bugFeedbackFilter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(500)
            .select("title message reportType area severity reproducibility status priority pageUrl updatedAt createdAt")
            .lean()
        : Promise.resolve([])
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
