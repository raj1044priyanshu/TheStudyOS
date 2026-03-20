import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { upsertFormulaEntry } from "@/lib/formula-sheet";
import { markFeatureUsed } from "@/lib/progress";

const schema = z.object({
  formulaText: z.string().min(1),
  formulaName: z.string().optional(),
  subject: z.string().min(2),
  chapter: z.string().optional(),
  noteId: z.string().optional(),
  noteTitle: z.string().optional(),
  isManual: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`formula:${authResult.userId}`, "formula");
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const result = await upsertFormulaEntry({
      userId: authResult.userId,
      ...parsed.data,
      noteId: parsed.data.noteId,
      noteTitle: parsed.data.noteTitle
    });
    await markFeatureUsed(authResult.userId, "formula-sheet");

    return NextResponse.json({ count: result.count, skipped: result.skipped });
  } catch (error) {
    return routeError("formula-sheet:extract", error);
  }
}
