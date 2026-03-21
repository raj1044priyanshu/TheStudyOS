import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { FormulaSheetModel } from "@/models/FormulaSheet";

const schema = z.object({
  subjects: z.array(z.string().min(2)).min(1)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`formula-sheet:init:${authResult.userId}`);
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    await Promise.all(
      parsed.data.subjects.map((subject) =>
        FormulaSheetModel.updateOne(
          { userId: authResult.userId, subject },
          { $setOnInsert: { userId: authResult.userId, subject, formulas: [] } },
          { upsert: true }
        )
      )
    );

    return NextResponse.json({ success: true, count: parsed.data.subjects.length });
  } catch (error) {
    return routeError("formula-sheet:init", error);
  }
}
