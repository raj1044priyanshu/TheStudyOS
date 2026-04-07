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
import { FeedbackModel } from "@/models/Feedback";

interface Context {
  params: { id: string };
}

const updateSchema = z
  .object({
    status: z.enum(["open", "in_review", "needs_retest", "resolved", "ignored"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    labels: z.array(z.string().trim().min(1).max(50)).max(12).optional(),
    adminNotes: z.string().max(2000).optional()
  })
  .refine((payload) => payload.status || payload.priority || payload.labels || payload.adminNotes !== undefined, {
    message: "No feedback updates provided."
  });

export async function GET(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-feedback-detail"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    await connectToDatabase();
    const item = await FeedbackModel.findById(parsedId.data).lean();
    if (!item) {
      return Response.json({ error: "Feedback not found." }, { status: 404 });
    }

    return Response.json({ item: toSerializable(item) });
  } catch (error) {
    return routeError("admin:feedback:get", error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-feedback-update"
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
    const item = await FeedbackModel.findById(parsedId.data);
    if (!item) {
      return Response.json({ error: "Feedback not found." }, { status: 404 });
    }

    const before = item.toObject();

    if (payload.data.status) {
      item.status = payload.data.status;
      item.resolvedAt = payload.data.status === "resolved" ? new Date() : null;
    }

    if (payload.data.priority) {
      item.priority = payload.data.priority;
    }

    if (payload.data.labels) {
      item.labels = payload.data.labels;
    }

    if (typeof payload.data.adminNotes === "string") {
      item.adminNotes = payload.data.adminNotes;
    }

    await item.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "feedback.update",
      targetModel: "Feedback",
      targetId: parsedId.data,
      summary: `Updated feedback ${parsedId.data}`,
      before,
      after: item.toObject()
    });

    return Response.json({ ok: true, item: toSerializable(item.toObject()) });
  } catch (error) {
    return routeError("admin:feedback:update", error);
  }
}
