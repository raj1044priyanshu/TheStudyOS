export const dynamic = "force-dynamic";

import { getAdminResourceConfig } from "@/lib/admin/resources";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";

interface Context {
  params: { resource: string; id: string };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    const config = getAdminResourceConfig(params.resource);
    if (!config) {
      return Response.json({ error: "Unknown resource." }, { status: 404 });
    }

    await connectToDatabase();
    const item = await config.model.findById(params.id).lean();

    if (!item) {
      return Response.json({ error: "Record not found." }, { status: 404 });
    }

    return Response.json({ item: toSerializable(item) });
  } catch (error) {
    return routeError("admin:resources:get", error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    const config = getAdminResourceConfig(params.resource);
    if (!config) {
      return Response.json({ error: "Unknown resource." }, { status: 404 });
    }

    const payload = (await request.json().catch(() => null)) as { updates?: Record<string, unknown> } | null;
    if (!payload?.updates || typeof payload.updates !== "object") {
      return Response.json({ error: "Invalid update payload." }, { status: 400 });
    }

    await connectToDatabase();
    const item = await config.model.findById(params.id);
    if (!item) {
      return Response.json({ error: "Record not found." }, { status: 404 });
    }

    const before = item.toObject();
    Object.entries(payload.updates).forEach(([key, value]) => {
      if (key === "_id") {
        return;
      }
      item.set(key, value);
    });

    await item.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "resource.update",
      targetModel: config.label,
      targetId: item._id.toString(),
      summary: `Updated ${config.label} record`,
      before,
      after: item.toObject()
    });

    return Response.json({ ok: true, item: toSerializable(item.toObject()) });
  } catch (error) {
    return routeError("admin:resources:update", error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    const config = getAdminResourceConfig(params.resource);
    if (!config) {
      return Response.json({ error: "Unknown resource." }, { status: 404 });
    }

    const payload = (await request.json().catch(() => null)) as { confirmation?: string } | null;
    const expected = `DELETE ${params.resource}:${params.id}`;
    if (!payload?.confirmation || payload.confirmation !== expected) {
      return Response.json({ error: `Confirmation must match "${expected}".` }, { status: 400 });
    }

    await connectToDatabase();
    const item = await config.model.findById(params.id);
    if (!item) {
      return Response.json({ error: "Record not found." }, { status: 404 });
    }

    const before = item.toObject();
    await item.deleteOne();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "resource.delete",
      targetModel: config.label,
      targetId: params.id,
      summary: `Deleted ${config.label} record`,
      before
    });

    return Response.json({ ok: true });
  } catch (error) {
    return routeError("admin:resources:delete", error);
  }
}
