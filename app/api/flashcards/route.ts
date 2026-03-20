import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit, parseJsonArray } from "@/lib/api";
import { generateContent } from "@/lib/gemini";
import { FlashcardModel } from "@/models/Flashcard";
import { scheduleRevisionItem } from "@/lib/revision";
import { markFeatureUsed } from "@/lib/progress";

const schema = z.object({
  topic: z.string().min(2),
  subject: z.string().min(2).default("Other")
});

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`flashcards:${authResult.userId}`);
  if (rate) return rate;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const response = await generateContent(
    `Create 15 concise flashcards for ${parsed.data.topic} in ${parsed.data.subject}. Return only JSON array of objects: [{"front":"","back":""}]`
  );
  const cards = parseJsonArray(response) as { front: string; back: string }[];

  await connectToDatabase();
  const deck = await FlashcardModel.create({
    userId: authResult.userId,
    topic: parsed.data.topic,
    subject: parsed.data.subject,
    cards: cards.map((card) => ({ ...card, difficulty: "medium" }))
  });

  await Promise.allSettled([
    scheduleRevisionItem({
      userId: authResult.userId,
      topic: parsed.data.topic,
      subject: parsed.data.subject,
      type: "flashcard",
      sourceId: deck._id.toString(),
      sourceTitle: parsed.data.topic
    }),
    markFeatureUsed(authResult.userId, "flashcards")
  ]);

  return NextResponse.json({ success: true, deck });
}
