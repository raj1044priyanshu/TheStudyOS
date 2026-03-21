export const dynamic = "force-dynamic";

import { createAdminAuditLog } from "@/lib/admin/audit";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppErrorLogModel } from "@/models/AppErrorLog";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const item = await AppErrorLogModel.findById(params.id).lean();
    if (!item) {
      return Response.json({ error: "Error log not found." }, { status: 404 });
    }

    return Response.json({ item: toSerializable(item) });
  } catch (error) {
    return routeError("admin:errors:get", error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    const payload = (await request.json().catch(() => null)) as
      | {
          status?: "open" | "acknowledged" | "resolved" | "ignored";
        }
      | null;

    if (!payload?.status) {
      return Response.json({ error: "Status is required." }, { status: 400 });
    }

    await connectToDatabase();
    const item = await AppErrorLogModel.findById(params.id);
    if (!item) {
      return Response.json({ error: "Error log not found." }, { status: 404 });
    }

    const before = item.toObject();
    item.status = payload.status;
    await item.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "error.update",
      targetModel: "AppErrorLog",
      targetId: params.id,
      summary: `Marked error ${params.id} as ${payload.status}`,
      before,
      after: item.toObject()
    });

    return Response.json({ ok: true, item: toSerializable(item.toObject()) });
  } catch (error) {
    return routeError("admin:errors:update", error);
  }
}
