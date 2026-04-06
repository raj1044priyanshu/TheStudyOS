export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { AiUsageEventModel } from "@/models/AiUsageEvent";

function getNextPacificMidnight(reference = new Date()) {
  const pacificNow = new Date(reference.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const nextMidnightPacific = new Date(pacificNow);
  nextMidnightPacific.setHours(24, 0, 0, 0);
  return new Date(reference.getTime() + (nextMidnightPacific.getTime() - pacificNow.getTime()));
}

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-ai-usage"
    });
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [summaryWindow, last24hWindow, byProvider, byRoute, recent] = await Promise.all([
      AiUsageEventModel.aggregate<{ requests: number; tokens: number; images: number; errors: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: null,
            requests: { $sum: 1 },
            tokens: { $sum: "$totalTokens" },
            images: { $sum: "$imageCount" },
            errors: { $sum: { $cond: ["$success", 0, 1] } }
          }
        }
      ]),
      AiUsageEventModel.aggregate<{ requests: number; tokens: number; images: number; errors: number }>([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        {
          $group: {
            _id: null,
            requests: { $sum: 1 },
            tokens: { $sum: "$totalTokens" },
            images: { $sum: "$imageCount" },
            errors: { $sum: { $cond: ["$success", 0, 1] } }
          }
        }
      ]),
      AiUsageEventModel.aggregate<{ provider: string; requests: number; tokens: number; images: number; errors: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: "$provider",
            requests: { $sum: 1 },
            tokens: { $sum: "$totalTokens" },
            images: { $sum: "$imageCount" },
            errors: { $sum: { $cond: ["$success", 0, 1] } }
          }
        },
        { $sort: { requests: -1 } },
        {
          $project: {
            _id: 0,
            provider: "$_id",
            requests: 1,
            tokens: 1,
            images: 1,
            errors: 1
          }
        }
      ]),
      AiUsageEventModel.aggregate<{ route: string; requests: number; tokens: number; errors: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: "$route",
            requests: { $sum: 1 },
            tokens: { $sum: "$totalTokens" },
            errors: { $sum: { $cond: ["$success", 0, 1] } }
          }
        },
        { $sort: { requests: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            route: "$_id",
            requests: 1,
            tokens: 1,
            errors: 1
          }
        }
      ]),
      AiUsageEventModel.find({})
        .sort({ createdAt: -1 })
        .limit(12)
        .select("provider capability route model totalTokens imageCount success errorCode keyFingerprint createdAt")
        .lean()
    ]);

    const summary = summaryWindow[0] ?? { requests: 0, tokens: 0, images: 0, errors: 0 };
    const last24h = last24hWindow[0] ?? { requests: 0, tokens: 0, images: 0, errors: 0 };

    return Response.json({
      summary: {
        requests: summary.requests,
        totalTokens: summary.tokens,
        imageGenerations: summary.images,
        errorRate: summary.requests ? Math.round((summary.errors / summary.requests) * 1000) / 10 : 0
      },
      last24h: {
        requests: last24h.requests,
        totalTokens: last24h.tokens,
        imageGenerations: last24h.images,
        errorRate: last24h.requests ? Math.round((last24h.errors / last24h.requests) * 1000) / 10 : 0
      },
      byProvider: byProvider.map((item) => ({
        ...item,
        errorRate: item.requests ? Math.round((item.errors / item.requests) * 1000) / 10 : 0
      })),
      byRoute: byRoute.map((item) => ({
        ...item,
        errorRate: item.requests ? Math.round((item.errors / item.requests) * 1000) / 10 : 0
      })),
      recent: recent.map((item) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
      })),
      dailyQuotaResetAt: getNextPacificMidnight(now).toISOString(),
      aiStudioLinks: {
        usage: "https://aistudio.google.com/",
        rateLimits: "https://ai.google.dev/gemini-api/docs/rate-limits",
        pricing: "https://ai.google.dev/gemini-api/docs/pricing"
      }
    });
  } catch (error) {
    return routeError("admin:ai-usage:get", error);
  }
}
