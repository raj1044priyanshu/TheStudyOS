export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/auth";
import { getAppSettings } from "@/lib/app-settings";
import { applyRouteRateLimit, routeError } from "@/lib/api";
import { captureAppError } from "@/lib/error-logging";
import { getRequestIp } from "@/lib/request-meta";

const errorSchema = z.object({
  source: z.enum(["client", "render", "unhandled_rejection"]).default("client"),
  severity: z.enum(["info", "warning", "error", "fatal"]).default("error"),
  message: z.string().trim().min(1).max(4000),
  stack: z.string().max(16000).optional().default(""),
  digest: z.string().max(255).optional().default(""),
  url: z.string().trim().max(2048).optional().default(""),
  route: z.string().trim().max(512).optional().default(""),
  userAgent: z.string().trim().max(2048).optional().default(""),
  viewport: z.string().trim().max(120).optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

export async function POST(request: Request) {
  try {
    const settings = await getAppSettings();
    if (!settings.featureToggles.errorMonitoring) {
      return Response.json({ ok: false, error: "Error monitoring disabled." }, { status: 403 });
    }

    const session = await auth();
    const payload = errorSchema.parse(await request.json());
    const ip = getRequestIp(request) || "anonymous";
    const identifier = session?.user?.id ? `client-error:user:${session.user.id}` : `client-error:ip:${ip}`;
    const rate = await applyRouteRateLimit(identifier, "clientError");
    if (rate) return rate;

    const log = await captureAppError({
      source: payload.source,
      severity: payload.severity,
      message: payload.message,
      stack: payload.stack,
      digest: payload.digest,
      url: payload.url,
      route: payload.route,
      userAgent: payload.userAgent,
      userId: session?.user?.id ?? null,
      userEmail: session?.user?.email ?? null,
      metadata: {
        ...payload.metadata,
        viewport: payload.viewport,
        ip
      }
    });

    return Response.json({ ok: true, errorLogId: log._id.toString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Invalid error payload." }, { status: 400 });
    }

    return routeError("errors:client", error);
  }
}
