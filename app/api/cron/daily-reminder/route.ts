import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { sendDailyReminderEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
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

  let sent = 0;
  let failed = 0;

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
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to process daily reminder", error);
    }
  }

  return NextResponse.json({ candidates: users.length, sent, failed });
}
