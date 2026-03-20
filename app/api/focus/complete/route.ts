import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { FocusSessionModel } from "@/models/FocusSession";
import { logActivity } from "@/lib/progress";
import { generateJsonWithFallback } from "@/lib/ai";

const schema = z.object({
  subject: z.string().min(2),
  topic: z.string().min(2),
  duration: z.number().min(1).max(240),
  wasCompleted: z.boolean(),
  soundUsed: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`focus-complete:${authResult.userId}`, "focusComplete");
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();

    await FocusSessionModel.create({
      userId: authResult.userId,
      ...parsed.data,
      completedAt: new Date()
    });

    const events = await logActivity({
      userId: authResult.userId,
      subject: parsed.data.subject,
      type: "focus",
      minutesStudied: parsed.data.duration
    });

    const suggestion = await generateJsonWithFallback<{ nextTopic: string; reason: string }>({
      prompt: `A student just finished studying '${parsed.data.topic}' from ${parsed.data.subject}
for ${parsed.data.duration} minutes. Suggest ONE specific next topic they should
study to continue logically. Return ONLY JSON: { "nextTopic": "", "reason": "" }`
    });

    return NextResponse.json({
      streak: events.streakUpdated.current,
      message: parsed.data.wasCompleted ? "Session complete." : "Session saved.",
      nextTopicSuggestion: suggestion.data,
      events
    });
  } catch (error) {
    return routeError("focus-complete", error);
  }
}
