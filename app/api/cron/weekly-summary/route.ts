import { startOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getActiveStudyStats } from "@/lib/study-time";
import { UserModel } from "@/models/User";
import { ProgressModel } from "@/models/Progress";
import { QuizModel } from "@/models/Quiz";
import { sendWeeklySummaryEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { verifyCronSecret } from "@/lib/api";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const users = await UserModel.find({ email: { $exists: true, $ne: null } })
    .select("_id email timezone")
    .lean();

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const activeStats = await getActiveStudyStats({
      userId: user._id.toString(),
      timezone: user.timezone ?? "UTC"
    });

    const [notesAgg, quizAgg] = await Promise.all([
      ProgressModel.aggregate<{ total: number }>([
        { $match: { userId: user._id, date: { $gte: start } } },
        { $group: { _id: null, total: { $sum: "$notesGenerated" } } }
      ]),
      QuizModel.aggregate<{ avg: number; count: number }>([
        { $match: { userId: user._id, completedAt: { $gte: start } } },
        { $group: { _id: null, avg: { $avg: "$score" }, count: { $sum: 1 } } }
      ])
    ]);

    const summary = {
      minutes: activeStats.weekMinutes,
      notes: notesAgg[0]?.total ?? 0,
      quizzes: quizAgg[0]?.count ?? 0,
      avgScore: Math.round(quizAgg[0]?.avg ?? 0)
    };

    try {
      await sendWeeklySummaryEmail(user.email!, summary);
      await createNotification({
        userId: user._id.toString(),
        type: "weekly_summary",
        title: "Weekly summary delivered",
        message: `You logged ${summary.minutes} active minutes this week with ${summary.quizzes} quiz attempt(s).`,
        actionUrl: "/dashboard/track"
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to process weekly summary email", error);
    }
  }

  return NextResponse.json({ sent, failed });
}
