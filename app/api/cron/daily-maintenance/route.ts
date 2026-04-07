import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { sendDailyReminderEmail, sendStreakBrokenEmail, sendStreakRiskEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { usersForStreakBreak, usersForStreakRisk } from "@/lib/progress";
import { dayKeyInTimeZone, hourInTimeZone, normalizeTimeZone } from "@/lib/timezone";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const now = new Date();

  const users = await UserModel.find({
    email: { $exists: true, $ne: null }
  })
    .select("_id email timezone lastActive lastDailyReminderDay")
    .lean();

  let dailyReminderSent = 0;
  let dailyReminderFailed = 0;

  for (const user of users) {
    const timezone = normalizeTimeZone(user.timezone);
    const todayKey = dayKeyInTimeZone(now, timezone);
    const localHour = hourInTimeZone(now, timezone);
    if (localHour < 18 || localHour > 22) continue;
    if (user.lastDailyReminderDay === todayKey) continue;
    const lastActiveKey = user.lastActive ? dayKeyInTimeZone(new Date(user.lastActive), timezone) : null;
    if (lastActiveKey === todayKey) continue;

    try {
      await sendDailyReminderEmail(user.email!);
      await createNotification({
        userId: user._id.toString(),
        type: "reminder",
        title: "Daily reminder sent",
        message: "You have pending study tasks. A quick session today keeps your momentum strong.",
        actionUrl: "/dashboard"
      });
      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            lastDailyReminderDay: todayKey
          }
        }
      );
      dailyReminderSent += 1;
    } catch (error) {
      dailyReminderFailed += 1;
      console.error("Failed to process daily reminder", error);
    }
  }

  const streakRiskUsers = await usersForStreakRisk();
  let streakRiskSent = 0;
  let streakRiskFailed = 0;

  for (const user of streakRiskUsers) {
    try {
      await sendStreakRiskEmail(user.email, user.streak);
      await createNotification({
        userId: user.userId,
        type: "reminder",
        title: "Streak reminder",
        message: `Your ${user.streak}-day streak is waiting for today's study session.`,
        actionUrl: "/planner"
      });
      await UserModel.updateOne(
        { _id: user.userId },
        {
          $set: {
            lastStreakRiskReminderDay: user.dayKey
          }
        }
      );
      streakRiskSent += 1;
    } catch (error) {
      streakRiskFailed += 1;
      console.error("Failed to process streak-risk notification", error);
    }
  }

  const streakBreakCandidates = await usersForStreakBreak();
  let streakBreakSent = 0;
  let streakBreakFailed = 0;

  for (const item of streakBreakCandidates) {
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
      streakBreakSent += 1;
    } catch (error) {
      streakBreakFailed += 1;
      console.error("Failed to process streak-break notification", error);
    }
  }

  return NextResponse.json({
    dailyReminder: {
      candidates: users.length,
      sent: dailyReminderSent,
      failed: dailyReminderFailed
    },
    streakRisk: {
      candidates: streakRiskUsers.length,
      sent: streakRiskSent,
      failed: streakRiskFailed
    },
    streakBreak: {
      candidates: streakBreakCandidates.length,
      sent: streakBreakSent,
      failed: streakBreakFailed
    }
  });
}
