export const dynamic = "force-dynamic";

import { getAdminResourceConfig } from "@/lib/admin/resources";
import { buildRegexSearchFilter, parsePositiveInt } from "@/lib/admin/query";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";

interface Context {
  params: { resource: string };
}

export async function GET(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-resource-list"
    });
    if (authResult.error) return authResult.error;

    const config = getAdminResourceConfig(params.resource);
    if (!config) {
      return Response.json({ error: "Unknown resource." }, { status: 404 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 1000);
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
    const q = searchParams.get("q") ?? "";
    const userId = searchParams.get("userId") ?? "";

    const filter: Record<string, unknown> = {
      ...buildRegexSearchFilter(config.searchFields, q)
    };

    if ("supportsUserFilter" in config && config.supportsUserFilter && userId) {
      filter.userId = userId;
    }

    const [items, total] = await Promise.all([
      config.model
        .find(filter)
        .sort(config.sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      config.model.countDocuments(filter)
    ]);

    return Response.json({
      resource: params.resource,
      label: config.label,
      total,
      page,
      limit,
      items: toSerializable(items)
    });
  } catch (error) {
    return routeError("admin:resources:list", error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-resource-create"
    });
    if (authResult.error) return authResult.error;

    const config = getAdminResourceConfig(params.resource);
    if (!config) {
      return Response.json({ error: "Unknown resource." }, { status: 404 });
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") {
      return Response.json({ error: "Invalid resource payload." }, { status: 400 });
    }

    await connectToDatabase();
    const created = await config.model.create(payload);

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "resource.create",
      targetModel: config.label,
      targetId: created._id.toString(),
      summary: `Created ${config.label} record`,
      after: created.toObject()
    });

    return Response.json({ ok: true, item: toSerializable(created.toObject()) }, { status: 201 });
  } catch (error) {
    return routeError("admin:resources:create", error);
  }
}
