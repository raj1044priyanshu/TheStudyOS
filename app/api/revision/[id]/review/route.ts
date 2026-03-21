import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { reviewRevisionItem } from "@/lib/revision";
import { logActivity } from "@/lib/progress";

const schema = z.object({
  quality: z.number().min(0).max(5)
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const item = await reviewRevisionItem(params.id, authResult.userId, parsed.data.quality);
    if (!item) {
      return NextResponse.json({ error: "Revision item not found" }, { status: 404 });
    }

    const events = await logActivity({
      userId: authResult.userId,
      subject: item.subject,
      type: "revision"
    });

    return NextResponse.json({
      nextReviewDate: item.nextReviewDate,
      interval: item.interval,
      message:
        parsed.data.quality <= 1 ? "Don't worry — it'll come back sooner" : `Next review in ${item.interval} days`,
      events
    });
  } catch (error) {
    return routeError("revision-review", error);
  }
}
