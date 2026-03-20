import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { DoubtsSessionModel } from "@/models/DoubtsSession";
import { generateGroqContent } from "@/lib/groq";
import { generateContent } from "@/lib/gemini";

const bodySchema = z.object({
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
        timestamp: z.string().optional()
      })
    )
    .default([]),
  subject: z.string().min(2)
});

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`doubts:${authResult.userId}`);
  if (rate) return rate;

  const parse = bodySchema.safeParse(await request.json());
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }

  const { message, history, subject } = parse.data;
  const systemPrompt = `You are StudyOS Tutor for ${subject}. Sound like a warm teacher, not a textbook.

Always reply in plain text using exactly these section labels:
Quick idea:
<2 to 4 short sentences>

Solved example:
1. ...
2. ...
3. ...

Remember:
<1 short takeaway sentence>

Rules:
- Default total length is 140 to 220 words unless the user clearly asks for more depth.
- Use simple language, short sentences, and one clean worked example.
- Never write long introductions, long conclusions, or lecture-style filler.
- Avoid phrases like "let us understand", "the definition is", or "in conclusion".
- Keep math readable in plain text and use numbered steps when solving.
- If the question is not mathematical, still keep the same three-section structure with one practical example.`;

  const historyText = history
    .slice(-10)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join("\n");

  let aiText = "";
  try {
    aiText = await generateGroqContent(`${historyText}\nUSER: ${message}\nAI:`, systemPrompt);
  } catch {
    aiText = await generateContent(`${historyText}\nUSER: ${message}\nAI:`, systemPrompt);
  }

  await connectToDatabase();
  await DoubtsSessionModel.create({
    userId: authResult.userId,
    subject,
    messages: [
      ...history.slice(-10).map((item) => ({ ...item, timestamp: new Date(item.timestamp || Date.now()) })),
      { role: "user", content: message, timestamp: new Date() },
      { role: "assistant", content: aiText, timestamp: new Date() }
    ]
  });

  const encoder = new TextEncoder();
  const chunks = aiText.match(/[\s\S]{1,24}/g) ?? [aiText];

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
