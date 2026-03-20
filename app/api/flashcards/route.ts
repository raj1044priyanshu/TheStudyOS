import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit, parseJsonArray } from "@/lib/api";
import { generateContent } from "@/lib/gemini";
import { FlashcardModel } from "@/models/Flashcard";

const schema = z.object({
  topic: z.string().min(2)
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
    `Create 15 concise flashcards for ${parsed.data.topic}. Return only JSON array of objects: [{"front":"","back":""}]`
  );
  const cards = parseJsonArray(response) as { front: string; back: string }[];

  await connectToDatabase();
  const deck = await FlashcardModel.create({
    userId: authResult.userId,
    topic: parsed.data.topic,
    cards: cards.map((card) => ({ ...card, difficulty: "medium" }))
  });

  return NextResponse.json({ success: true, deck });
}
