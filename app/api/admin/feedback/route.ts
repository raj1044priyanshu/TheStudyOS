export const dynamic = "force-dynamic";

import { buildRegexSearchFilter } from "@/lib/admin/query";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { FeedbackModel } from "@/models/Feedback";

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status") ?? "";
    const category = searchParams.get("category") ?? "";
    const rating = searchParams.get("rating") ?? "";
    const userId = searchParams.get("userId") ?? "";
    const reporter = searchParams.get("reporter") ?? "";

    const filter: Record<string, unknown> = {
      ...buildRegexSearchFilter(["message", "name", "email", "pageUrl"], q)
    };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (rating) filter.rating = Number(rating);
    if (userId) filter.userId = userId;
    if (reporter === "authenticated") filter.userId = { $ne: null };
    if (reporter === "anonymous") filter.userId = null;

    const items = await FeedbackModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();

    return Response.json({ items: toSerializable(items) });
  } catch (error) {
    return routeError("admin:feedback:list", error);
  }
}
