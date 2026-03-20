import { format, startOfWeek } from "date-fns";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { getActiveStudyStats } from "@/lib/study-time";
import { UserModel } from "@/models/User";
import { ProgressModel } from "@/models/Progress";
import { QuizModel } from "@/models/Quiz";
import { AchievementModel } from "@/models/Achievement";
import { StudyPlanModel } from "@/models/StudyPlan";

interface PlannerTask {
  subject: string;
  topic: string;
  duration: number;
  completed?: boolean;
}

interface PlannerDay {
  date: string;
  tasks: PlannerTask[];
}

interface PlannerDocument {
  _id: Types.ObjectId;
  generatedPlan: PlannerDay[];
}

interface CompletedQuizPoint {
  score: number;
}

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`dashboard:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();

  const objectUserId = new Types.ObjectId(authResult.userId);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const today = format(new Date(), "yyyy-MM-dd");
  const user = await UserModel.findById(authResult.userId)
    .select(
      "name streak level xp totalNotesGenerated totalQuizzesTaken onboardingCompleted isTourShown welcomeScreenSeen streakBreakPending lastBrokenStreak streakBrokenAt timezone"
    )
    .lean();
  const activeStats = await getActiveStudyStats({
    userId: authResult.userId,
    timezone: user?.timezone ?? "UTC"
  });

  const [quizStats, subjectBreakdown, completedQuizzes, pendingQuizzes, achievements, latestPlan] =
    await Promise.all([
      QuizModel.aggregate<{ avg: number }>([
        { $match: { userId: objectUserId, completedAt: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$score" } } }
      ]),
      ProgressModel.aggregate<{ subject: string; minutes: number }>([
        { $match: { userId: objectUserId, date: { $gte: weekStart } } },
        { $group: { _id: "$subjectStudied", minutes: { $sum: "$minutesStudied" } } },
        { $sort: { minutes: -1 } },
        { $project: { _id: 0, subject: "$_id", minutes: 1 } }
      ]),
      QuizModel.find({ userId: authResult.userId, completedAt: { $ne: null } })
        .sort({ completedAt: -1 })
        .limit(6)
        .select("completedAt score")
        .lean<CompletedQuizPoint[]>(),
      QuizModel.find({ userId: authResult.userId, completedAt: null }).sort({ createdAt: -1 }).limit(3).select("topic subject").lean(),
      AchievementModel.find({ userId: authResult.userId }).sort({ unlockedAt: -1 }).limit(4).lean(),
      StudyPlanModel.findOne({ userId: authResult.userId }).sort({ createdAt: -1 }).select("generatedPlan").lean()
    ]);

  const planner = latestPlan as PlannerDocument | null;
  const todayPlan = planner?.generatedPlan.find((day) => day.date === today) ?? null;
  const fallbackPlan = planner?.generatedPlan.find((day) => day.date >= today) ?? null;
  const dailyTasks = (todayPlan?.tasks ?? fallbackPlan?.tasks ?? []).slice(0, 4);
  const completedDailyTasks = dailyTasks.filter((task) => Boolean(task.completed)).length;
  const dailyGoalProgress = dailyTasks.length ? Math.round((completedDailyTasks / dailyTasks.length) * 100) : 0;

  const quizTimeline = [...completedQuizzes]
    .reverse()
    .map((quiz, index) => ({ label: `Week ${index + 1}`, score: quiz.score ?? 0 }));

  const totalStudyMinutes = subjectBreakdown.reduce((sum, item) => sum + item.minutes, 0);

  return NextResponse.json({
    profile: {
      name: user?.name ?? authResult.session?.user?.name ?? "Student"
    },
    onboarding: {
      shouldShowWelcome: user?.welcomeScreenSeen === false,
      shouldStartTour: !(user?.isTourShown ?? false)
    },
    stats: {
      streak: user?.streak ?? 0,
      level: user?.level ?? 1,
      xp: user?.xp ?? 0,
      totalNotesGenerated: user?.totalNotesGenerated ?? 0,
      totalQuizzesTaken: user?.totalQuizzesTaken ?? 0,
      averageQuizScore: Math.round(quizStats[0]?.avg ?? 0),
      studyMinutesWeek: activeStats.weekMinutes,
      pendingQuizzes: pendingQuizzes.length,
      dailyGoalProgress,
      dailyGoalCompleted: completedDailyTasks,
      dailyGoalTotal: dailyTasks.length
    },
    streakBreakAlert:
      user?.streakBreakPending
        ? {
            previous: user.lastBrokenStreak ?? 0,
            brokenAt: user.streakBrokenAt ? new Date(user.streakBrokenAt).toISOString() : null
          }
        : null,
    subjectBreakdown: subjectBreakdown.map((item) => ({
      subject: item.subject || "General",
      minutes: item.minutes,
      percentage: totalStudyMinutes ? Math.round((item.minutes / totalStudyMinutes) * 100) : 0
    })),
    quizTimeline,
    recentAchievements: achievements.map((achievement) => ({
      id: achievement._id.toString(),
      title: achievement.title,
      description: achievement.description,
      unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt).toISOString() : new Date().toISOString()
    })),
    dailyTasks: dailyTasks.map((task, index) => ({
      id: `${today}-${index}`,
      label: `${task.subject}: ${task.topic}`,
      completed: Boolean(task.completed)
    })),
    pendingQuizzes: pendingQuizzes.map((quiz) => ({
      id: quiz._id.toString(),
      topic: quiz.topic,
      subject: quiz.subject
    }))
  });
}
