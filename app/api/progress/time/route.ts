import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { getActiveStudyStats, recordActiveStudyTime } from "@/lib/study-time";
import { UserModel } from "@/models/User";

const bodySchema = z.object({
  seconds: z.number().min(0).max(3600)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`progress-time:${authResult.userId}`);
    if (rate) return rate;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findById(authResult.userId).select("timezone").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const trackedSeconds = await recordActiveStudyTime({
      userId: authResult.userId,
      timezone: user.timezone ?? "UTC",
      seconds: parsed.data.seconds
    });

    const activeStats = await getActiveStudyStats({
      userId: authResult.userId,
      timezone: user.timezone ?? "UTC"
    });

    return NextResponse.json({
      success: true,
      trackedSeconds,
      todayMinutes: activeStats.todayMinutes,
      studyMinutesWeek: activeStats.weekMinutes,
      totalMinutes: activeStats.totalMinutes,
      dailyMinutes: activeStats.dailyMinutes
    });
  } catch (error) {
    console.error("Failed to record active study time", error);
    return NextResponse.json({ error: "Unable to record active study time right now." }, { status: 500 });
  }
}
