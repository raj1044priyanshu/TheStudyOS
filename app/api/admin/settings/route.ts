export const dynamic = "force-dynamic";

import { revalidateTag } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { PUBLIC_APP_SETTINGS_CACHE_TAG, getAppSettings, mergeAppSettings, mergeWithDefaultAppSettings } from "@/lib/app-settings";
import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AppSettingsModel } from "@/models/AppSettings";

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-settings"
    });
    if (authResult.error) return authResult.error;

    const settings = await getAppSettings();
    return Response.json({ settings: toSerializable(settings) });
  } catch (error) {
    return routeError("admin:settings:get", error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-settings-update"
    });
    if (authResult.error) return authResult.error;

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") {
      return Response.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await AppSettingsModel.findOne({ key: "site" });
    if (!existing) {
      const merged = mergeWithDefaultAppSettings(payload as never);
      const created = await AppSettingsModel.create({ key: "site", ...merged });
      await createAdminAuditLog({
        actorUserId: authResult.userId,
        action: "settings.create",
        targetModel: "AppSettings",
        targetId: created._id.toString(),
        summary: "Created site settings",
        after: created.toObject()
      });
      revalidateTag(PUBLIC_APP_SETTINGS_CACHE_TAG);
      return Response.json({ ok: true, settings: toSerializable(created.toObject()) });
    }

    const before = existing.toObject();
    const merged = mergeAppSettings(toSerializable(existing.toObject()) as never, payload as never);

    existing.set(merged);
    await existing.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "settings.update",
      targetModel: "AppSettings",
      targetId: existing._id.toString(),
      summary: "Updated site settings",
      before,
      after: existing.toObject()
    });

    revalidateTag(PUBLIC_APP_SETTINGS_CACHE_TAG);
    return Response.json({ ok: true, settings: toSerializable(existing.toObject()) });
  } catch (error) {
    return routeError("admin:settings:update", error);
  }
}
