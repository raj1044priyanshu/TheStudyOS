export const dynamic = "force-dynamic";

import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AdminAuditLogModel } from "@/models/AdminAuditLog";

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-audit"
    });
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const filter: Record<string, unknown> = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ action: regex }, { targetModel: regex }, { targetId: regex }, { summary: regex }];
    }

    const items = await AdminAuditLogModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return Response.json({ items: toSerializable(items) });
  } catch (error) {
    return routeError("admin:audit:list", error);
  }
}
