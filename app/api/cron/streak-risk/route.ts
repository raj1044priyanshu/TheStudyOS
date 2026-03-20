import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { usersForStreakRisk } from "@/lib/progress";
import { sendStreakRiskEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { UserModel } from "@/models/User";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const users = await usersForStreakRisk();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    users.map(async (user) => {
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
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("Failed to process streak-risk notification", error);
      }
    })
  );

  return NextResponse.json({ candidates: users.length, sent, failed });
}
