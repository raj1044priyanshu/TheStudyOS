import { subDays } from "date-fns";
import { Types } from "mongoose";
import { AchievementModel } from "@/models/Achievement";
import { ProgressModel } from "@/models/Progress";
import { QuizModel } from "@/models/Quiz";
import { StudyPlanModel } from "@/models/StudyPlan";
import { UserModel } from "@/models/User";
import { getActiveStudyStats } from "@/lib/study-time";
import { dayKeyInTimeZone, hourInTimeZone, normalizeTimeZone, relativeDayKeyInTimeZone } from "@/lib/timezone";
import type { AchievementType, GamificationEvent } from "@/types";

const STREAK_EMAIL_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

const ACHIEVEMENT_DETAILS: Record<AchievementType, { title: string; description: string }> = {
  first_note: { title: "First Note", description: "Generated your first note." },
  five_notes: { title: "Note Builder", description: "Generated 5 notes." },
  ten_notes: { title: "Topper Writer", description: "Generated 10 notes." },
  twentyfive_notes: { title: "Revision Library", description: "Generated 25 notes." },
  first_quiz: { title: "Quiz Starter", description: "Completed your first quiz." },
  five_quizzes: { title: "Quiz Runner", description: "Completed 5 quizzes." },
  ten_quizzes: { title: "Quiz Marathon", description: "Completed 10 quizzes." },
  quiz_master_80: { title: "Quiz Master", description: "Scored 80% or above in a quiz." },
  quiz_master_90: { title: "Quiz Ace", description: "Scored 90% or above in a quiz." },
  first_plan: { title: "First Plan", description: "Created your first study plan." },
  first_task_completed: { title: "Task Ticked Off", description: "Completed your first planner task." },
  ten_tasks_completed: { title: "Task Finisher", description: "Completed 10 planner tasks." },
  fifty_tasks_completed: { title: "Momentum Builder", description: "Completed 50 planner tasks." },
  streak_3: { title: "3 Day Streak", description: "Studied 3 days in a row." },
  streak_7: { title: "7 Day Streak", description: "Studied 7 days in a row." },
  streak_14: { title: "14 Day Streak", description: "Studied 14 days in a row." },
  streak_30: { title: "30 Day Streak", description: "Studied 30 days in a row." },
  streak_60: { title: "60 Day Streak", description: "Studied 60 days in a row." },
  streak_100: { title: "100 Day Streak", description: "Studied 100 days in a row." },
  active_60_minutes: { title: "Focused Hour", description: "Spent 60 active minutes in StudyOS." },
  weekly_300_minutes: { title: "Weekly Grind", description: "Reached 300 active study minutes this week." },
  weekly_600_minutes: { title: "Deep Work Week", description: "Reached 600 active study minutes this week." },
  level_5: { title: "Level 5", description: "Reached level 5." },
  level_10: { title: "Level 10", description: "Reached level 10." },
  level_20: { title: "Level 20", description: "Reached level 20." }
};

type ActivityType = "note" | "quiz" | "study" | "planner";

interface LogActivityInput {
  userId: string;
  subject: string;
  type: ActivityType;
  minutesStudied?: number;
  quizScore?: number;
  notesGenerated?: number;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function calculateXp(input: LogActivityInput): number {
  if (input.type === "note") {
    return 15;
  }
  if (input.type === "quiz") {
    const scoreBonus = Math.floor((input.quizScore ?? 0) / 4);
    return 25 + scoreBonus;
  }
  if (input.type === "study") {
    return Math.floor((input.minutesStudied ?? 0) / 10);
  }
  return 5;
}

function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function highestStreakMilestoneFor(streak: number) {
  if (streak < STREAK_EMAIL_MILESTONES[0]) {
    return null;
  }

  const fixedMilestone = [...STREAK_EMAIL_MILESTONES].reverse().find((milestone) => streak >= milestone);
  if (streak < 100) {
    return fixedMilestone ?? null;
  }

  return Math.floor(streak / 100) * 100;
}

async function upsertAchievement(type: AchievementType, userId: string) {
  const result = await AchievementModel.updateOne(
    { userId, type },
    {
      $setOnInsert: {
        userId,
        type,
        ...ACHIEVEMENT_DETAILS[type]
      }
    },
    { upsert: true }
  );

  return result.upsertedCount > 0;
}

export async function evaluateAchievements(userId: string, streak: number, level: number) {
  const objectUserId = new Types.ObjectId(userId);
  const unlockedTypes = new Set(
    (await AchievementModel.find({ userId }).select("type").lean()).map((item) => item.type as AchievementType)
  );

  const user = await UserModel.findById(userId).select("totalNotesGenerated totalQuizzesTaken timezone").lean();
  const activeStats = await getActiveStudyStats({
    userId,
    timezone: user?.timezone ?? "UTC"
  });

  const [quizStats, studyPlanCount, completedPlannerTasksAgg] = await Promise.all([
    QuizModel.aggregate<{ maxScore: number }>([
      { $match: { userId: objectUserId, completedAt: { $ne: null } } },
      { $group: { _id: null, maxScore: { $max: "$score" } } }
    ]),
    StudyPlanModel.countDocuments({ userId }),
    StudyPlanModel.aggregate<{ total: number }>([
      { $match: { userId: objectUserId } },
      { $unwind: "$generatedPlan" },
      { $unwind: "$generatedPlan.tasks" },
      { $match: { "generatedPlan.tasks.completed": true } },
      { $count: "total" }
    ])
  ]);

  const totalNotes = user?.totalNotesGenerated ?? 0;
  const totalQuizCount = user?.totalQuizzesTaken ?? 0;
  const highestQuizScore = quizStats[0]?.maxScore ?? 0;
  const completedPlannerTasks = completedPlannerTasksAgg[0]?.total ?? 0;

  const unlockedNow: AchievementType[] = [];
  const checkAndPush = (type: AchievementType, condition: boolean) => {
    if (condition && !unlockedTypes.has(type)) {
      unlockedNow.push(type);
    }
  };

  checkAndPush("first_note", totalNotes >= 1);
  checkAndPush("five_notes", totalNotes >= 5);
  checkAndPush("ten_notes", totalNotes >= 10);
  checkAndPush("twentyfive_notes", totalNotes >= 25);
  checkAndPush("first_quiz", totalQuizCount >= 1);
  checkAndPush("five_quizzes", totalQuizCount >= 5);
  checkAndPush("ten_quizzes", totalQuizCount >= 10);
  checkAndPush("quiz_master_80", highestQuizScore >= 80);
  checkAndPush("quiz_master_90", highestQuizScore >= 90);
  checkAndPush("first_plan", studyPlanCount >= 1);
  checkAndPush("first_task_completed", completedPlannerTasks >= 1);
  checkAndPush("ten_tasks_completed", completedPlannerTasks >= 10);
  checkAndPush("fifty_tasks_completed", completedPlannerTasks >= 50);
  checkAndPush("streak_3", streak >= 3);
  checkAndPush("streak_7", streak >= 7);
  checkAndPush("streak_14", streak >= 14);
  checkAndPush("streak_30", streak >= 30);
  checkAndPush("streak_60", streak >= 60);
  checkAndPush("streak_100", streak >= 100);
  checkAndPush("active_60_minutes", activeStats.totalMinutes >= 60);
  checkAndPush("weekly_300_minutes", activeStats.weekMinutes >= 300);
  checkAndPush("weekly_600_minutes", activeStats.weekMinutes >= 600);
  checkAndPush("level_5", level >= 5);
  checkAndPush("level_10", level >= 10);
  checkAndPush("level_20", level >= 20);

  const insertedNow: AchievementType[] = [];

  for (const type of unlockedNow) {
    if (await upsertAchievement(type, userId)) {
      insertedNow.push(type);
    }
  }

  return insertedNow.map((type) => ({ type, ...ACHIEVEMENT_DETAILS[type] }));
}

export async function logActivity(input: LogActivityInput): Promise<GamificationEvent> {
  const now = new Date();
  const todayUtc = startOfUtcDay(now);
  const xpGained = calculateXp(input);

  await ProgressModel.updateOne(
    { userId: input.userId, date: todayUtc, subjectStudied: input.subject },
    {
      $setOnInsert: {
        userId: input.userId,
        date: todayUtc,
        subjectStudied: input.subject
      },
      $inc: {
        minutesStudied: input.minutesStudied ?? 0,
        notesGenerated: input.notesGenerated ?? 0,
        quizScore: input.quizScore ?? 0
      }
    },
    { upsert: true }
  );

  const user = await UserModel.findById(input.userId);
  if (!user) {
    return {
      xpGained: 0,
      levelUp: { happened: false, from: 1, to: 1 },
      newAchievements: [],
      streakUpdated: { previous: 0, current: 0 },
      streakBroken: { happened: false, previous: 0, at: null },
      streakMilestone: { happened: false, milestone: null }
    };
  }

  const previousLevel = user.level;
  const previousStreak = user.streak;
  const previousLastActive = user.lastActive ? new Date(user.lastActive) : null;
  const timezone = normalizeTimeZone(user.timezone);
  user.timezone = timezone;
  const todayKey = dayKeyInTimeZone(now, timezone);
  const yesterdayKey = relativeDayKeyInTimeZone(now, -1, timezone);
  let streakBroken: GamificationEvent["streakBroken"] = {
    happened: false,
    previous: 0,
    at: null
  };

  user.xp += xpGained;
  user.level = levelFromXp(user.xp);
  if (input.type === "note") {
    user.totalNotesGenerated += 1;
  }
  if (input.type === "quiz") {
    user.totalQuizzesTaken += 1;
  }
  if (user.level > previousLevel) {
    user.lastLevelUpAt = now;
  }

  const lastStreakDayKey = user.streakLastActivityAt ? dayKeyInTimeZone(new Date(user.streakLastActivityAt), timezone) : null;

  if (!lastStreakDayKey) {
    const fallbackLastDayKey = previousLastActive ? dayKeyInTimeZone(previousLastActive, timezone) : null;
    if (!fallbackLastDayKey) {
      user.streak = 1;
    } else if (fallbackLastDayKey === todayKey) {
      user.streak = Math.max(user.streak, 1);
    } else if (fallbackLastDayKey === yesterdayKey) {
      user.streak = Math.max(user.streak + 1, 1);
    } else {
      if (user.streak > 0) {
        streakBroken = {
          happened: true,
          previous: user.streak,
          at: now.toISOString()
        };
        user.lastBrokenStreak = user.streak;
        user.streakBrokenAt = now;
        user.streakBreakPending = true;
      }
      user.streak = 1;
    }
    user.streakLastActivityAt = now;
    if (!streakBroken.happened) {
      user.streakBreakPending = false;
    }
  } else if (lastStreakDayKey === todayKey) {
    // Same-day activity should never increase streak more than once.
  } else if (lastStreakDayKey === yesterdayKey) {
    user.streak += 1;
    user.streakLastActivityAt = now;
    user.streakBreakPending = false;
  } else {
    streakBroken = {
      happened: true,
      previous: Math.max(user.streak, 1),
      at: now.toISOString()
    };
    user.lastBrokenStreak = streakBroken.previous;
    user.streakBrokenAt = now;
    user.streakBreakPending = true;
    user.streak = 1;
    user.streakLastActivityAt = now;
  }

  const milestone = highestStreakMilestoneFor(user.streak);
  const previousMilestone = user.lastStreakCelebrationMilestone ?? 0;
  const streakMilestone: GamificationEvent["streakMilestone"] =
    milestone && milestone > previousMilestone
      ? { happened: true, milestone }
      : { happened: false, milestone: null };

  if (streakMilestone.happened && streakMilestone.milestone) {
    user.lastStreakCelebrationMilestone = streakMilestone.milestone;
  }

  const newStreak = user.streak;
  user.lastActive = now;
  await user.save();

  const achievements = await evaluateAchievements(input.userId, newStreak, user.level);

  return {
    xpGained,
    levelUp: { happened: user.level > previousLevel, from: previousLevel, to: user.level },
    newAchievements: achievements,
    streakUpdated: { previous: previousStreak, current: newStreak },
    streakBroken,
    streakMilestone
  };
}

export async function usersForStreakRisk() {
  const now = new Date();

  const users = await UserModel.find({ streak: { $gt: 0 } })
    .select("email streak _id timezone streakLastActivityAt lastStreakRiskReminderDay")
    .lean();
  const result: { userId: string; email: string; streak: number; dayKey: string }[] = [];

  for (const user of users) {
    if (!user.email) continue;

    const timezone = normalizeTimeZone(user.timezone);
    const todayKey = dayKeyInTimeZone(now, timezone);
    const yesterdayKey = relativeDayKeyInTimeZone(now, -1, timezone);
    const localHour = hourInTimeZone(now, timezone);
    if (localHour < 17 || localHour > 22) continue;
    if (user.lastStreakRiskReminderDay === todayKey) continue;

    const lastStreakDayKey = user.streakLastActivityAt ? dayKeyInTimeZone(new Date(user.streakLastActivityAt), timezone) : null;
    if (lastStreakDayKey && lastStreakDayKey === yesterdayKey) {
      result.push({ userId: user._id.toString(), email: user.email, streak: user.streak, dayKey: todayKey });
      continue;
    }

    // Backward compatibility for users created before streakLastActivityAt existed.
    if (!lastStreakDayKey) {
      const fallbackYesterday = startOfUtcDay(subDays(now, 1));
      const hadYesterday = await ProgressModel.exists({ userId: user._id, date: fallbackYesterday });
      if (hadYesterday) {
        result.push({ userId: user._id.toString(), email: user.email, streak: user.streak, dayKey: todayKey });
      }
    }
  }

  return result;
}

export async function usersForStreakBreak() {
  const now = new Date();

  const users = await UserModel.find({ streak: { $gt: 0 } })
    .select("email streak _id timezone streakLastActivityAt lastStreakBreakNoticeDay")
    .lean();

  return users
    .filter((user) => Boolean(user.email))
    .flatMap((user) => {
      const timezone = normalizeTimeZone(user.timezone);
      const todayKey = dayKeyInTimeZone(now, timezone);
      const yesterdayKey = relativeDayKeyInTimeZone(now, -1, timezone);
      const localHour = hourInTimeZone(now, timezone);
      if (localHour < 6 || localHour > 11) return [];
      if (user.lastStreakBreakNoticeDay === todayKey) return [];

      const lastStreakDayKey = user.streakLastActivityAt ? dayKeyInTimeZone(new Date(user.streakLastActivityAt), timezone) : null;
      if (!lastStreakDayKey) return [];
      if (lastStreakDayKey === todayKey || lastStreakDayKey === yesterdayKey) return [];

      return [
        {
          userId: user._id.toString(),
          email: user.email!,
          streak: user.streak,
          dayKey: todayKey
        }
      ];
    });
}
