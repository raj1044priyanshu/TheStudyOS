export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/auth";
import { getAppSettings } from "@/lib/app-settings";
import { applyRouteRateLimit, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestIp, parseUserAgentDetails } from "@/lib/request-meta";
import { FeedbackModel } from "@/models/Feedback";

const feedbackSchema = z.object({
  source: z.enum(["landing", "dashboard", "other"]).default("landing"),
  category: z
    .enum(["general", "bug", "feature_request", "content", "design", "performance", "support", "other"])
    .default("general"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  message: z.string().trim().min(8).max(5000),
  name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(240).optional().or(z.literal("")).default(""),
  pageUrl: z.string().trim().max(2048),
  referrer: z.string().trim().max(2048).optional().default(""),
  viewport: z.string().trim().max(120).optional().default("")
});

export async function POST(request: Request) {
  try {
    const settings = await getAppSettings();
    if (!settings.feedbackEnabled || !settings.featureToggles.feedback) {
      return Response.json({ error: "Feedback is currently disabled." }, { status: 403 });
    }

    const session = await auth();
    const payload = feedbackSchema.parse(await request.json());
    const ip = getRequestIp(request) || "anonymous";
    const identifier = session?.user?.id ? `feedback:user:${session.user.id}` : `feedback:ip:${ip}`;
    const rate = await applyRouteRateLimit(identifier, "feedback");
    if (rate) return rate;

    const userAgent = request.headers.get("user-agent");
    const { browser, os } = parseUserAgentDetails(userAgent);

    await connectToDatabase();

    const created = await FeedbackModel.create({
      userId: session?.user?.id ?? null,
      source: payload.source,
      category: payload.category,
      rating: payload.rating ?? null,
      message: payload.message,
      status: "open",
      priority: payload.category === "bug" ? "high" : "medium",
      name: payload.name,
      email: payload.email,
      pageUrl: payload.pageUrl,
      referrer: payload.referrer,
      userAgent: userAgent ?? "",
      viewport: payload.viewport,
      browser,
      os,
      ip
    });

    return Response.json({
      ok: true,
      feedbackId: created._id.toString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Invalid feedback payload." }, { status: 400 });
    }

    return routeError("feedback:post", error);
  }
}
