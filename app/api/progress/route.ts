import { startOfWeek } from "date-fns";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { getActiveStudyStats } from "@/lib/study-time";
import { UserModel } from "@/models/User";
import { QuizModel } from "@/models/Quiz";
import { PlannerCheckpointModel } from "@/models/PlannerCheckpoint";
import { ProgressModel } from "@/models/Progress";

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`progress:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  const objectUserId = new Types.ObjectId(authResult.userId);
  const user = await UserModel.findById(authResult.userId).lean();
  const activeStats = await getActiveStudyStats({
    userId: authResult.userId,
    timezone: user?.timezone ?? "UTC"
  });

  const [quizStats, subjectBreakdown, quizTimeline, weakTopics, checkpointStats, recentCheckpoints] = await Promise.all([
    QuizModel.aggregate<{ avg: number }>([
      { $match: { userId: objectUserId, completedAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$score" } } }
    ]),
    ProgressModel.aggregate<{ subject: string; minutes: number }>([
      { $match: { userId: objectUserId, date: { $gte: startOfWeek(new Date(), { weekStartsOn: 1 }) } } },
      { $group: { _id: "$subjectStudied", minutes: { $sum: "$minutesStudied" } } },
      { $project: { _id: 0, subject: "$_id", minutes: 1 } }
    ]),
    QuizModel.find({ userId: authResult.userId, completedAt: { $ne: null } })
      .sort({ completedAt: 1 })
      .select("completedAt score")
      .lean(),
    QuizModel.aggregate<{ topic: string; score: number }>([
      { $match: { userId: objectUserId, completedAt: { $ne: null } } },
      { $group: { _id: "$topic", score: { $avg: "$score" } } },
      { $match: { score: { $lt: 60 } } },
      { $project: { _id: 0, topic: "$_id", score: { $round: ["$score", 1] } } }
    ]),
    PlannerCheckpointModel.aggregate<{ averageScore: number; total: number; passed: number }>([
      { $match: { userId: objectUserId, status: "submitted" } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: "$score" },
          total: { $sum: 1 },
          passed: { $sum: { $cond: ["$passed", 1, 0] } }
        }
      }
    ]),
    PlannerCheckpointModel.find({ userId: authResult.userId, status: "submitted" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("subject chapter score passed updatedAt")
      .lean()
  ]);

  return NextResponse.json({
    stats: {
      streak: user?.streak ?? 0,
      xp: user?.xp ?? 0,
      level: user?.level ?? 1,
      totalNotesGenerated: user?.totalNotesGenerated ?? 0,
      totalQuizzesTaken: user?.totalQuizzesTaken ?? 0,
      averageQuizScore: Math.round(quizStats[0]?.avg ?? 0),
      averageCheckpointScore: Math.round(checkpointStats[0]?.averageScore ?? 0),
      totalCheckpoints: checkpointStats[0]?.total ?? 0,
      passedCheckpoints: checkpointStats[0]?.passed ?? 0,
      studyMinutesWeek: activeStats.weekMinutes
    },
    subjectBreakdown,
    quizTimeline: quizTimeline.map((item) => ({ date: item.completedAt, score: item.score })),
    weeklyHeatmap: activeStats.dailyMinutes.map((item) => ({
      date: item.dayKey,
      value: item.minutes
    })),
    weakTopics,
    recentCheckpoints: recentCheckpoints.map((item) => ({
      subject: item.subject,
      chapter: item.chapter,
      score: item.score,
      passed: item.passed,
      updatedAt: item.updatedAt
    })),
    todayMinutes: activeStats.todayMinutes
  });
}
