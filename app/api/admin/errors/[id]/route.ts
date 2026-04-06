export const dynamic = "force-dynamic";

import { z } from "zod";
import { createAdminAuditLog } from "@/lib/admin/audit";
import {
  buildValidationErrorResponse,
  objectIdRouteParamSchema,
  requireRateLimitedAdmin,
  routeError
} from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppErrorLogModel } from "@/models/AppErrorLog";

interface Context {
  params: { id: string };
}

const updateSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "ignored"])
});

export async function GET(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-error-detail"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    await connectToDatabase();
    const item = await AppErrorLogModel.findById(parsedId.data).lean();
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
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-error-update"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    const payload = updateSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return buildValidationErrorResponse(payload.error);
    }

    await connectToDatabase();
    const item = await AppErrorLogModel.findById(parsedId.data);
    if (!item) {
      return Response.json({ error: "Error log not found." }, { status: 404 });
    }

    const before = item.toObject();
    item.status = payload.data.status;
    await item.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "error.update",
      targetModel: "AppErrorLog",
      targetId: parsedId.data,
      summary: `Marked error ${parsedId.data} as ${payload.data.status}`,
      before,
      after: item.toObject()
    });

    return Response.json({ ok: true, item: toSerializable(item.toObject()) });
  } catch (error) {
    return routeError("admin:errors:update", error);
  }
}
