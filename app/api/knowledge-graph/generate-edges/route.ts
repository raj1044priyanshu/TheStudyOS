import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { upsertConceptNode } from "@/lib/knowledge-graph";
import { markFeatureUsed } from "@/lib/progress";

const schema = z.object({
  conceptName: z.string().min(2),
  subject: z.string().min(2),
  sourceId: z.string().min(1),
  sourceType: z.enum(["note", "quiz", "doubt", "flashcard"]),
  sourceTitle: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`graph:${authResult.userId}`, "graph");
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const node = await upsertConceptNode({
      userId: authResult.userId,
      ...parsed.data
    });
    await markFeatureUsed(authResult.userId, "knowledge-graph");

    return NextResponse.json({ node });
  } catch (error) {
    return routeError("knowledge-graph:generate", error);
  }
}
