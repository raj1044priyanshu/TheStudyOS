export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser, routeError } from "@/lib/api";
import { redis } from "@/lib/ratelimit";
import { generateStructuredDataWithFallback as generateJsonWithFallback } from "@/lib/content-service";

type FocusSuggestion = {
  nextTopic: string;
  reason: string;
};

async function getSuggestion(subject: string, topic: string) {
  const cacheKey = `focus:suggestion:${subject}:${topic}`;
  if (redis) {
    const cached = await redis.get<FocusSuggestion>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await generateJsonWithFallback<FocusSuggestion>({
    prompt: `A student just finished studying '${topic}' from ${subject}
for 25 minutes. Suggest ONE specific next topic they should
study to continue logically. Return ONLY JSON: { "nextTopic": "", "reason": "" }`
  });

  if (redis) {
    await redis.set(cacheKey, result.data, { ex: 60 * 60 });
  }
  return result.data;
}

export async function GET(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const url = new URL(request.url);
    const subject = url.searchParams.get("subject")?.trim();
    const topic = url.searchParams.get("topic")?.trim();
    if (!subject || !topic) {
      return NextResponse.json({ error: "Subject and topic are required" }, { status: 400 });
    }

    const suggestion = await getSuggestion(subject, topic);
    return NextResponse.json(suggestion);
  } catch (error) {
    return routeError("focus-suggestion", error);
  }
}
