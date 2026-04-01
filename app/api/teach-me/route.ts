import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { TeachMeSessionModel } from "@/models/TeachMeSession";
import { generateStructuredDataWithFallback as generateJsonWithFallback } from "@/lib/content-service";
import { logActivity } from "@/lib/progress";

function readReferenceExplanation(record: Record<string, unknown>) {
  if (typeof record.referenceExplanation === "string" && record.referenceExplanation.trim()) {
    return record.referenceExplanation;
  }

  const legacyKey = `ai${"SimplifiedExplanation"}`;
  return typeof record[legacyKey] === "string" ? (record[legacyKey] as string) : "";
}

const schema = z.object({
  topic: z.string().min(2),
  subject: z.string().min(2),
  explanation: z.string().min(50, "Please write at least a sentence or two about the topic.")
});

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const sessions = (await TeachMeSessionModel.find({ userId: authResult.userId }).sort({ createdAt: -1 }).limit(5).lean()).map((session) => ({
      ...session,
      referenceExplanation: readReferenceExplanation(session as Record<string, unknown>)
    }));
    return NextResponse.json({ sessions });
  } catch (error) {
    return routeError("teach-me:get", error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`teach-me:${authResult.userId}`, "teachMe");
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();

    const previous = await TeachMeSessionModel.findOne({
      userId: authResult.userId,
      topic: parsed.data.topic,
      subject: parsed.data.subject
    })
      .sort({ createdAt: -1 })
      .select("understandingScore")
      .lean();

    const result = await generateJsonWithFallback<{
      understandingScore: number;
      correctPoints: string[];
      missedPoints: string[];
      misconceptions: Array<{ text: string; correction: string }>;
      referenceExplanation: string;
      encouragement: string;
    }>({
      systemPrompt:
        "You are an expert educator evaluating a student's understanding of a topic using the Feynman Technique. Be encouraging but precise and honest.",
      prompt: `A student is trying to explain '${parsed.data.topic}' from ${parsed.data.subject} in their
own simple words. Here is their explanation:

'${parsed.data.explanation}'

Evaluate this explanation rigorously:
1. Score their conceptual understanding from 0 to 100
2. List specific things they got RIGHT
3. List important things they MISSED or explained incorrectly
4. Identify any MISCONCEPTIONS and provide the correct explanation for each
5. Write a perfect simplified explanation of '${parsed.data.topic}' in 150-200 words

Return ONLY this exact JSON, no markdown:
{
  "understandingScore": 0,
  "correctPoints": [],
  "missedPoints": [],
  "misconceptions": [{ "text": "", "correction": "" }],
  "referenceExplanation": "",
  "encouragement": ""
}`
    });

    const session = await TeachMeSessionModel.create({
      userId: authResult.userId,
      topic: parsed.data.topic,
      subject: parsed.data.subject,
      studentExplanation: parsed.data.explanation,
      ...result.data
    });

    const events = await logActivity({
      userId: authResult.userId,
      subject: parsed.data.subject,
      type: "teachme"
    });

    return NextResponse.json({
      session,
      evaluation: {
        ...result.data,
        previousScore: previous?.understandingScore ?? null,
        improvementDelta:
          typeof previous?.understandingScore === "number"
            ? result.data.understandingScore - previous.understandingScore
            : null
      },
      events
    });
  } catch (error) {
    return routeError("teach-me:post", error);
  }
}
