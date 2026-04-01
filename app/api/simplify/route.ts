import { z } from "zod";
import { NextResponse } from "next/server";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { generateTextWithFallback as generatePlainTextWithFallback } from "@/lib/content-service";
import { markFeatureUsed } from "@/lib/progress";

const schema = z.object({
  text: z.string().min(20).max(1000),
  topic: z.string().min(2),
  subject: z.string().min(2),
  level: z.enum(["phd", "professor", "teacher", "student", "child"])
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`simplify:${authResult.userId}`, "simplify");
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const simplifiedText = await generatePlainTextWithFallback(
      `Rewrite the following academic text at the '${parsed.data.level}' comprehension
level. The content is about '${parsed.data.topic}' from ${parsed.data.subject}.

Complexity guidelines:
- 'phd': Use advanced academic vocabulary, assume deep domain expertise,
  include nuance, edge cases, and theoretical implications. Dense and precise.
- 'professor': Technical but accessible, assume undergraduate-level knowledge,
  include context and importance.
- 'teacher': Clear explanations, minimal jargon, good analogies, suitable for
  a high school teacher explaining to students.
- 'student': Simple language, relatable analogies, no jargon, suitable for a
  15-year-old. Use examples from daily life.
- 'child': Extremely simple, short sentences, fun analogies, as if explaining
  to a curious 8-year-old. Use a toy, food, or game analogy.

Original text:
'${parsed.data.text}'

Return ONLY the rewritten text. No preamble, no explanation, just the text.`
    );

    await markFeatureUsed(authResult.userId, "simplify");

    return NextResponse.json({
      simplifiedText: simplifiedText.trim(),
      level: parsed.data.level,
      wordCount: simplifiedText.trim().split(/\s+/).filter(Boolean).length
    });
  } catch (error) {
    return routeError("simplify:post", error);
  }
}
