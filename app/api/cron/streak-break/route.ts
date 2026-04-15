import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { usersForStreakBreak } from "@/lib/progress";
import { createNotification } from "@/lib/notifications";
import { sendStreakBrokenEmail } from "@/lib/email";
import { UserModel } from "@/models/User";
import { verifyCronSecret } from "@/lib/api";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const candidates = await usersForStreakBreak();
  let sent = 0;
  let failed = 0;

  for (const item of candidates) {
    try {
      const previous = item.streak;
      await UserModel.updateOne(
        { _id: item.userId, streak: { $gt: 0 } },
        {
          $set: {
            streakBreakPending: true,
            lastBrokenStreak: previous,
            streakBrokenAt: new Date(),
            lastStreakBreakNoticeDay: item.dayKey,
            streak: 0
          }
        }
      );

      await createNotification({
        userId: item.userId,
        type: "system",
        title: "Streak broken",
        message: `Your ${previous}-day streak was broken. Start again today.`,
        actionUrl: "/dashboard"
      });
      await sendStreakBrokenEmail(item.email, previous);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to process streak-break notification", error);
    }
  }

  return NextResponse.json({ candidates: candidates.length, sent, failed });
}

