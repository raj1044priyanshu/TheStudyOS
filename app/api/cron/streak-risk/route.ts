import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { usersForStreakRisk } from "@/lib/progress";
import { sendStreakRiskEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { UserModel } from "@/models/User";
import { verifyCronSecret } from "@/lib/api";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const users = await usersForStreakRisk();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
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
  }

  return NextResponse.json({ candidates: users.length, sent, failed });
}
