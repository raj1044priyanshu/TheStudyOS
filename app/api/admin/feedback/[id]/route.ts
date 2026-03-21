export const dynamic = "force-dynamic";

import { createAdminAuditLog } from "@/lib/admin/audit";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { FeedbackModel } from "@/models/Feedback";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const item = await FeedbackModel.findById(params.id).lean();
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
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    const payload = (await request.json().catch(() => null)) as
      | {
          status?: "open" | "in_review" | "resolved" | "ignored";
          priority?: "low" | "medium" | "high" | "urgent";
          labels?: string[];
          adminNotes?: string;
        }
      | null;

    if (!payload) {
      return Response.json({ error: "Invalid feedback payload." }, { status: 400 });
    }

    await connectToDatabase();
    const item = await FeedbackModel.findById(params.id);
    if (!item) {
      return Response.json({ error: "Feedback not found." }, { status: 404 });
    }

    const before = item.toObject();

    if (payload.status) {
      item.status = payload.status;
      item.resolvedAt = payload.status === "resolved" ? new Date() : null;
    }

    if (payload.priority) {
      item.priority = payload.priority;
    }

    if (payload.labels) {
      item.labels = payload.labels;
    }

    if (typeof payload.adminNotes === "string") {
      item.adminNotes = payload.adminNotes;
    }

    await item.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "feedback.update",
      targetModel: "Feedback",
      targetId: params.id,
      summary: `Updated feedback ${params.id}`,
      before,
      after: item.toObject()
    });

    return Response.json({ ok: true, item: toSerializable(item.toObject()) });
  } catch (error) {
    return routeError("admin:feedback:update", error);
  }
}
