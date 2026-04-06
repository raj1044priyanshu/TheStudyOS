import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildValidationErrorResponse, requireRateLimitedUser, routeError } from "@/lib/api";
import { scheduleRevisionItem } from "@/lib/revision";

const schema = z.object({
  topic: z.string().min(2),
  subject: z.string().min(2),
  type: z.enum(["note", "flashcard", "quiz", "manual"]),
  sourceId: z.string().optional(),
  sourceTitle: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "revisionMutation",
      key: "revision-schedule"
    });
    if (authResult.error) return authResult.error;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error);
    }

    await connectToDatabase();
    const item = await scheduleRevisionItem({
      userId: authResult.userId,
      ...parsed.data
    });

    return NextResponse.json({ item });
  } catch (error) {
    return routeError("revision-schedule", error);
  }
}
