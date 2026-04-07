export const dynamic = "force-dynamic";

import { z } from "zod";
import { requireRateLimitedTester, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestIp, parseUserAgentDetails } from "@/lib/request-meta";
import { areTesterToolsEnabled } from "@/lib/runtime-flags";
import {
  TESTER_BUG_AREAS,
  TESTER_BUG_REPRODUCIBILITY,
  TESTER_BUG_SEVERITIES,
  inferRequestEnvironment,
  mapTesterSeverityToPriority
} from "@/lib/tester-issues";
import { FeedbackModel } from "@/models/Feedback";

const testerIssueSchema = z.object({
  title: z.string().trim().min(6).max(180),
  area: z.enum(TESTER_BUG_AREAS),
  stepsToReproduce: z.string().trim().min(8).max(5000),
  expectedBehavior: z.string().trim().min(8).max(5000),
  actualBehavior: z.string().trim().min(8).max(5000),
  severity: z.enum(TESTER_BUG_SEVERITIES),
  reproducibility: z.enum(TESTER_BUG_REPRODUCIBILITY),
  workaround: z.string().trim().max(3000).optional().default(""),
  pageUrl: z.string().trim().max(2048),
  referrer: z.string().trim().max(2048).optional().default(""),
  viewport: z.string().trim().max(120).optional().default("")
});

export async function POST(request: Request) {
  try {
    if (!areTesterToolsEnabled()) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const authResult = await requireRateLimitedTester(request, {
      policy: "feedback",
      key: "tester-issue"
    });
    if (authResult.error) return authResult.error;

    const payload = testerIssueSchema.parse(await request.json());
    const userAgent = request.headers.get("user-agent");
    const { browser, os } = parseUserAgentDetails(userAgent);

    await connectToDatabase();

    const created = await FeedbackModel.create({
      userId: authResult.userId,
      reportType: "tester_bug",
      source: "dashboard",
      category: "bug",
      message: payload.title,
      title: payload.title,
      area: payload.area,
      severity: payload.severity,
      reproducibility: payload.reproducibility,
      stepsToReproduce: payload.stepsToReproduce,
      expectedBehavior: payload.expectedBehavior,
      actualBehavior: payload.actualBehavior,
      workaround: payload.workaround,
      status: "open",
      priority: mapTesterSeverityToPriority(payload.severity),
      name: authResult.user.name ?? "",
      email: authResult.user.email ?? authResult.session.user.email ?? "",
      pageUrl: payload.pageUrl,
      referrer: payload.referrer,
      userAgent: userAgent ?? "",
      viewport: payload.viewport,
      browser,
      os,
      ip: getRequestIp(request) || "",
      environment: inferRequestEnvironment(request)
    });

    return Response.json({
      ok: true,
      reportId: created._id.toString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Invalid tester issue payload." }, { status: 400 });
    }

    return routeError("tester-issues:post", error);
  }
}
