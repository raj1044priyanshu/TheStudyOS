import { subDays } from "date-fns";
import { hourInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import { getActiveStudyStats } from "@/lib/study-time";
import { AchievementModel } from "@/models/Achievement";
import { ExamModel } from "@/models/Exam";
import { FocusSessionModel } from "@/models/FocusSession";
import { FormulaSheetModel } from "@/models/FormulaSheet";
import { NoteModel } from "@/models/Note";
import { ProgressModel } from "@/models/Progress";
import { QuizModel } from "@/models/Quiz";
import { ScanResultModel } from "@/models/ScanResult";
import { StudyPlanModel } from "@/models/StudyPlan";
import { StudyRoomModel } from "@/models/StudyRoom";
import { TeachMeSessionModel } from "@/models/TeachMeSession";
import { UserModel } from "@/models/User";
import { syncLegacyXpFields, XP_AWARDS, getLevelFromXp } from "@/lib/xp";
import type { AchievementDefinition, AchievementType, GamificationEvent } from "@/types";

const REQUIRED_FEATURES_FOR_EXPLORER = [
  "notes",
  "quiz",
  "focus",
  "scanner",
  "teach-me",
  "revision",
  "formula-sheet",
  "exams",
  "study-room",
  "evaluator",
  "past-papers"
] as const;

export const ACHIEVEMENTS: Record<AchievementType, AchievementDefinition> = {
  first_note: { id: "first_note", name: "Note Taker", icon: "📝", desc: "Generated your first note", color: "#818CF8", xp: 20 },
  five_notes: { id: "five_notes", name: "Note Builder", icon: "📝", desc: "Generated 5 notes", color: "#818CF8", xp: 25 },
  ten_notes: { id: "ten_notes", name: "Study Scribe", icon: "✍️", desc: "10 notes generated", color: "#818CF8", xp: 35 },
  twentyfive_notes: { id: "twentyfive_notes", name: "Revision Library", icon: "📚", desc: "Generated 25 notes", color: "#6C63FF", xp: 45 },
  note_10: { id: "note_10", name: "Study Scribe", icon: "✍️", desc: "10 notes generated", color: "#818CF8", xp: 35 },
  note_50: { id: "note_50", name: "Encyclopedia", icon: "📚", desc: "50 notes generated", color: "#6C63FF", xp: 60 },
  first_quiz: { id: "first_quiz", name: "Quiz Starter", icon: "🧪", desc: "Completed your first quiz", color: "#38BDF8", xp: 20 },
  five_quizzes: { id: "five_quizzes", name: "Quiz Runner", icon: "🧪", desc: "Completed 5 quizzes", color: "#38BDF8", xp: 30 },
  ten_quizzes: { id: "ten_quizzes", name: "Quiz Marathon", icon: "🎯", desc: "Completed 10 quizzes", color: "#38BDF8", xp: 40 },
  quiz_10: { id: "quiz_10", name: "Quiz Master", icon: "🎯", desc: "10 quizzes completed", color: "#38BDF8", xp: 40 },
  quiz_master_80: { id: "quiz_master_80", name: "Quiz Master", icon: "🎯", desc: "Scored 80% or above in a quiz", color: "#38BDF8", xp: 25 },
  quiz_master_90: { id: "quiz_master_90", name: "Quiz Ace", icon: "💯", desc: "Scored 90% or above in a quiz", color: "#FCD34D", xp: 30 },
  quiz_perfect: { id: "quiz_perfect", name: "Perfectionist", icon: "💯", desc: "Scored 100% on a quiz", color: "#FCD34D", xp: 30 },
  first_plan: { id: "first_plan", name: "First Plan", icon: "📅", desc: "Created your first study plan", color: "#818CF8", xp: 20 },
  first_task_completed: { id: "first_task_completed", name: "Task Ticked Off", icon: "✅", desc: "Completed your first planner task", color: "#818CF8", xp: 10 },
  ten_tasks_completed: { id: "ten_tasks_completed", name: "Task Finisher", icon: "✅", desc: "Completed 10 planner tasks", color: "#818CF8", xp: 20 },
  fifty_tasks_completed: { id: "fifty_tasks_completed", name: "Momentum Builder", icon: "✅", desc: "Completed 50 planner tasks", color: "#818CF8", xp: 35 },
  streak_3: { id: "streak_3", name: "Getting Warm", icon: "🔥", desc: "3-day study streak", color: "#F97316", xp: 20 },
  streak_7: { id: "streak_7", name: "On Fire", icon: "🔥🔥", desc: "7-day study streak", color: "#EF4444", xp: 35 },
  streak_14: { id: "streak_14", name: "14 Day Streak", icon: "🔥", desc: "Studied 14 days in a row", color: "#F97316", xp: 40 },
  streak_30: { id: "streak_30", name: "Unstoppable", icon: "⚡", desc: "30-day study streak", color: "#FBBF24", xp: 60 },
  streak_60: { id: "streak_60", name: "60 Day Streak", icon: "⚡", desc: "Studied 60 days in a row", color: "#FBBF24", xp: 70 },
  streak_100: { id: "streak_100", name: "100 Day Streak", icon: "⚡", desc: "Studied 100 days in a row", color: "#FBBF24", xp: 90 },
  active_60_minutes: { id: "active_60_minutes", name: "Focused Hour", icon: "⏳", desc: "Spent 60 active minutes in StudyOS", color: "#10B981", xp: 20 },
  weekly_300_minutes: { id: "weekly_300_minutes", name: "Weekly Grind", icon: "📈", desc: "Reached 300 active study minutes this week", color: "#10B981", xp: 25 },
  weekly_600_minutes: { id: "weekly_600_minutes", name: "Deep Work Week", icon: "📈", desc: "Reached 600 active study minutes this week", color: "#10B981", xp: 35 },
  night_owl: { id: "night_owl", name: "Night Owl", icon: "🦉", desc: "Studied past midnight", color: "#7C3AED", xp: 15 },
  early_bird: { id: "early_bird", name: "Early Bird", icon: "🌅", desc: "Studied before 7am", color: "#F59E0B", xp: 15 },
  speed_note: { id: "speed_note", name: "Speed Learner", icon: "⚡", desc: "Generated a note in under 30 seconds", color: "#34D399", xp: 20 },
  feynman_5: { id: "feynman_5", name: "Feynman Scholar", icon: "🧠", desc: "5 Teach Me sessions completed", color: "#A855F7", xp: 35 },
  scan_first: { id: "scan_first", name: "Paper Digitizer", icon: "📸", desc: "Scanned your first paper", color: "#EC4899", xp: 20 },
  formula_20: { id: "formula_20", name: "Formula Collector", icon: "📐", desc: "20 formulas saved", color: "#06B6D4", xp: 35 },
  focus_60: { id: "focus_60", name: "Deep Focus", icon: "🎯", desc: "Completed a 60-minute focus session", color: "#10B981", xp: 25 },
  group_host: { id: "group_host", name: "Study Host", icon: "🏠", desc: "Hosted a group study room", color: "#F472B6", xp: 25 },
  all_features: { id: "all_features", name: "Explorer", icon: "🗺️", desc: "Used every feature at least once", color: "#6C63FF", xp: 75 },
  level_5: { id: "level_5", name: "Level 5", icon: "🎓", desc: "Reached level 5", color: "#818CF8", xp: 30 },
  level_10: { id: "level_10", name: "Level 10", icon: "🏆", desc: "Reached level 10", color: "#FBBF24", xp: 40 },
  level_20: { id: "level_20", name: "Level 20", icon: "🏆", desc: "Reached level 20", color: "#FBBF24", xp: 50 },
  level_scholar: { id: "level_scholar", name: "Scholar", icon: "🎓", desc: "Reached Scholar level (100 XP)", color: "#818CF8", xp: 20 },
  level_genius: { id: "level_genius", name: "Genius", icon: "🏆", desc: "Reached Genius level (500 XP)", color: "#FBBF24", xp: 40 }
};

type ActivityType = "note" | "quiz" | "study" | "planner" | "focus" | "teachme" | "scan" | "evaluation" | "revision";

interface LogActivityInput {
  userId: string;
  subject: string;
  type: ActivityType;
  minutesStudied?: number;
  quizScore?: number;
  notesGenerated?: number;
  durationSeconds?: number;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addActivityXp(input: LogActivityInput) {
  switch (input.type) {
    case "note":
      return XP_AWARDS.noteGenerated;
    case "quiz":
      return XP_AWARDS.quizCompleted + ((input.quizScore ?? 0) === 100 ? XP_AWARDS.quizPerfectBonus : 0);
    case "focus":
      return Math.max(1, Math.round((input.minutesStudied ?? 0) / 25)) * XP_AWARDS.focusSessionPer25Minutes;
    case "teachme":
      return XP_AWARDS.teachMeCompleted;
    case "scan":
      return XP_AWARDS.scanCompleted;
    case "evaluation":
      return XP_AWARDS.evaluationCompleted;
    case "revision":
      return XP_AWARDS.revisionItemReviewed;
    default:
      return 0;
  }
}

function toAchievementPayload(type: AchievementType) {
  const details = ACHIEVEMENTS[type];
  return {
    type,
    title: details.name,
    description: details.desc,
    icon: details.icon,
    color: details.color,
    xp: details.xp
  };
}

async function hasAchievement(userId: string, type: AchievementType) {
  return AchievementModel.exists({
    userId,
    $or: [{ achievementId: type }, { type }]
  });
}

async function unlockAchievement(userId: string, type: AchievementType) {
  const existing = await hasAchievement(userId, type);
  if (existing) {
    return null;
  }

  const details = ACHIEVEMENTS[type];
  await AchievementModel.create({
    userId,
    achievementId: type,
    type,
    title: details.name,
    description: details.desc,
    icon: details.icon,
    color: details.color,
    xp: details.xp
  });

  return details;
}

async function getFormulaCount(userId: string) {
  const sheets = await FormulaSheetModel.find({ userId }).select("formulas").lean();
  return sheets.reduce((sum, sheet) => sum + (sheet.formulas?.length ?? 0), 0);
}

async function countCompletedPlannerTasks(userId: string) {
  const plans = await StudyPlanModel.find({ userId }).select("generatedPlan").lean();
  return plans.reduce(
    (sum, plan) =>
      sum +
      (plan.generatedPlan ?? []).reduce(
        (
          daySum: number,
          day: {
            tasks?: Array<{
              completed?: boolean;
            }>;
          }
        ) => daySum + (day.tasks ?? []).filter((task: { completed?: boolean }) => Boolean(task.completed)).length,
        0
      ),
    0
  );
}

async function resolveAchievementCandidates(userId: string, user: {
  streak: number;
  totalNotesGenerated: number;
  totalQuizzesTaken: number;
  totalXP?: number;
  xp?: number;
  usedFeatures?: string[];
  timezone?: string;
}) {
  const activeStatsPromise = getActiveStudyStats({
    userId,
    timezone: user.timezone ?? "UTC"
  });

  const [
    maxQuizScore,
    studyPlanCount,
    completedPlannerTasks,
    teachMeCount,
    scanCount,
    focusCount,
    hostedRooms,
    formulaCount,
    activeStats
  ] = await Promise.all([
    QuizModel.findOne({ userId, completedAt: { $ne: null } }).sort({ score: -1 }).select("score").lean(),
    StudyPlanModel.countDocuments({ userId }),
    countCompletedPlannerTasks(userId),
    TeachMeSessionModel.countDocuments({ userId }),
    ScanResultModel.countDocuments({ userId }),
    FocusSessionModel.countDocuments({ userId, wasCompleted: true }),
    StudyRoomModel.countDocuments({ hostUserId: userId }),
    getFormulaCount(userId),
    activeStatsPromise
  ]);

  const totalXP = user.totalXP ?? user.xp ?? 0;
  const candidates: AchievementType[] = [];

  if (user.totalNotesGenerated >= 1) candidates.push("first_note");
  if (user.totalNotesGenerated >= 5) candidates.push("five_notes");
  if (user.totalNotesGenerated >= 10) candidates.push("ten_notes", "note_10");
  if (user.totalNotesGenerated >= 25) candidates.push("twentyfive_notes");
  if (user.totalNotesGenerated >= 50) candidates.push("note_50");

  if (user.totalQuizzesTaken >= 1) candidates.push("first_quiz");
  if (user.totalQuizzesTaken >= 5) candidates.push("five_quizzes");
  if (user.totalQuizzesTaken >= 10) candidates.push("ten_quizzes", "quiz_10");
  if ((maxQuizScore?.score ?? 0) >= 80) candidates.push("quiz_master_80");
  if ((maxQuizScore?.score ?? 0) >= 90) candidates.push("quiz_master_90");
  if ((maxQuizScore?.score ?? 0) >= 100) candidates.push("quiz_perfect");

  if (studyPlanCount >= 1) candidates.push("first_plan");
  if (completedPlannerTasks >= 1) candidates.push("first_task_completed");
  if (completedPlannerTasks >= 10) candidates.push("ten_tasks_completed");
  if (completedPlannerTasks >= 50) candidates.push("fifty_tasks_completed");

  if (user.streak >= 3) candidates.push("streak_3");
  if (user.streak >= 7) candidates.push("streak_7");
  if (user.streak >= 14) candidates.push("streak_14");
  if (user.streak >= 30) candidates.push("streak_30");
  if (user.streak >= 60) candidates.push("streak_60");
  if (user.streak >= 100) candidates.push("streak_100");

  if (activeStats.totalMinutes >= 60) candidates.push("active_60_minutes");
  if (activeStats.weekMinutes >= 300) candidates.push("weekly_300_minutes");
  if (activeStats.weekMinutes >= 600) candidates.push("weekly_600_minutes");

  if (teachMeCount >= 5) candidates.push("feynman_5");
  if (scanCount >= 1) candidates.push("scan_first");
  if (focusCount >= 1) {
    const maxFocus = await FocusSessionModel.findOne({ userId, wasCompleted: true }).sort({ duration: -1 }).select("duration").lean();
    if ((maxFocus?.duration ?? 0) >= 60) {
      candidates.push("focus_60");
    }
  }
  if (hostedRooms >= 1) candidates.push("group_host");
  if (formulaCount >= 20) candidates.push("formula_20");
  if (totalXP >= 100) candidates.push("level_scholar");
  if (totalXP >= 500) candidates.push("level_genius");
  if (getLevelFromXp(totalXP).level >= 5) candidates.push("level_5");
  if (getLevelFromXp(totalXP).level >= 10) candidates.push("level_10");
  if (getLevelFromXp(totalXP).level >= 20) candidates.push("level_20");

  const usedFeatures = new Set(user.usedFeatures ?? []);
  if (REQUIRED_FEATURES_FOR_EXPLORER.every((feature) => usedFeatures.has(feature))) {
    candidates.push("all_features");
  }

  return Array.from(new Set(candidates));
}

export async function evaluateAchievements(userId: string, _streak?: number, _level?: number) {
  const user = await UserModel.findById(userId).select("streak totalNotesGenerated totalQuizzesTaken totalXP xp usedFeatures timezone").lean();
  if (!user) {
    return [];
  }

  const candidates = await resolveAchievementCandidates(userId, user);
  const unlocked = [];

  for (const type of candidates) {
    const details = await unlockAchievement(userId, type);
    if (details) {
      unlocked.push(toAchievementPayload(type));
    }
  }

  return unlocked;
}

export async function markFeatureUsed(userId: string, feature: string) {
  await UserModel.updateOne({ _id: userId }, { $addToSet: { usedFeatures: feature } });
}

export async function runAchievementChecks(userId: string) {
  const unlocked = await evaluateAchievements(userId);
  if (!unlocked.length) {
    const user = await UserModel.findById(userId).select("totalXP xp").lean();
    return {
      newAchievements: [],
      totalXP: user?.totalXP ?? user?.xp ?? 0,
      level: getLevelFromXp(user?.totalXP ?? user?.xp ?? 0)
    };
  }

  const xpBonus = unlocked.reduce((sum, achievement) => sum + (achievement.xp ?? 0), 0);
  const user = await UserModel.findById(userId);
  if (!user) {
    return {
      newAchievements: unlocked,
      totalXP: 0,
      level: getLevelFromXp(0)
    };
  }

  const totalXP = (user.totalXP ?? user.xp ?? 0) + xpBonus;
  Object.assign(user, syncLegacyXpFields(totalXP));
  await user.save();

  return {
    newAchievements: unlocked,
    totalXP,
    level: getLevelFromXp(totalXP)
  };
}

export async function awardDailyLogin(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    return null;
  }

  const todayKey = utcDayKey();
  const lastActiveKey = user.lastActive ? utcDayKey(new Date(user.lastActive)) : null;
  if (lastActiveKey === todayKey) {
    return null;
  }

  const totalXP = (user.totalXP ?? user.xp ?? 0) + XP_AWARDS.dailyLogin;
  Object.assign(user, syncLegacyXpFields(totalXP));
  await user.save();
  return { totalXP, level: getLevelFromXp(totalXP) };
}

export async function logActivity(input: LogActivityInput): Promise<GamificationEvent> {
  const now = new Date();
  const todayUtc = startOfUtcDay(now);

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
  const lastActiveKey = user.lastActive ? utcDayKey(new Date(user.lastActive)) : null;
  const todayKey = utcDayKey(now);
  const yesterdayKey = utcDayKey(subDays(now, 1));

  let streakBroken: GamificationEvent["streakBroken"] = { happened: false, previous: 0, at: null };

  if (!lastActiveKey) {
    user.streak = 1;
  } else if (lastActiveKey === todayKey) {
    user.streak = Math.max(1, user.streak);
  } else if (lastActiveKey === yesterdayKey) {
    user.streak += 1;
  } else {
    streakBroken = {
      happened: user.streak > 0,
      previous: user.streak,
      at: now.toISOString()
    };
    user.streak = 1;
  }

  user.lastActive = now;
  user.streakLastActivityAt = now;
  user.streakBreakPending = false;

  const timezone = normalizeTimeZone(user.timezone);
  const localHour = hourInTimeZone(now, timezone);
  const usedFeatures = new Set(user.usedFeatures ?? []);

  const featureFromType: Partial<Record<ActivityType, string>> = {
    note: "notes",
    quiz: "quiz",
    focus: "focus",
    teachme: "teach-me",
    scan: "scanner",
    evaluation: "evaluator",
    revision: "revision"
  };
  const feature = featureFromType[input.type];
  if (feature) {
    usedFeatures.add(feature);
  }
  user.usedFeatures = Array.from(usedFeatures);

  if (input.type === "note") {
    user.totalNotesGenerated += input.notesGenerated ?? 1;
  }
  if (input.type === "quiz") {
    user.totalQuizzesTaken += 1;
  }

  let xpGained = addActivityXp(input);
  const beforeAchievementXP = user.totalXP ?? user.xp ?? 0;
  const totalAfterActivity = beforeAchievementXP + xpGained;
  Object.assign(user, syncLegacyXpFields(totalAfterActivity));
  if (user.level > previousLevel) {
    user.lastLevelUpAt = now;
  }

  await user.save();

  const unlocked = await evaluateAchievements(input.userId);
  const achievementXp = unlocked.reduce((sum, achievement) => sum + (achievement.xp ?? 0), 0);

  if (achievementXp > 0) {
    const refreshedUser = await UserModel.findById(input.userId);
    if (refreshedUser) {
      const totalXP = (refreshedUser.totalXP ?? refreshedUser.xp ?? 0) + achievementXp;
      Object.assign(refreshedUser, syncLegacyXpFields(totalXP));
      if (refreshedUser.level > previousLevel) {
        refreshedUser.lastLevelUpAt = now;
      }
      await refreshedUser.save();
    }
  }

  const finalUser = await UserModel.findById(input.userId).select("level totalXP xp").lean();
  const finalLevel = finalUser?.level ?? previousLevel;
  const totalXpEarned = xpGained + achievementXp;

  const streakMilestone =
    user.streak >= 30
      ? { happened: previousStreak < 30 && user.streak >= 30, milestone: previousStreak < 30 && user.streak >= 30 ? 30 : null }
      : user.streak >= 7
        ? { happened: previousStreak < 7 && user.streak >= 7, milestone: previousStreak < 7 && user.streak >= 7 ? 7 : null }
        : user.streak >= 3
          ? { happened: previousStreak < 3 && user.streak >= 3, milestone: previousStreak < 3 && user.streak >= 3 ? 3 : null }
          : { happened: false, milestone: null };

  const extraAchievements: AchievementType[] = [];
  if (localHour < 7) extraAchievements.push("early_bird");
  if (localHour === 0 || localHour === 1 || localHour === 2 || localHour === 3 || localHour === 4) extraAchievements.push("night_owl");
  if (input.type === "note" && (input.durationSeconds ?? Infinity) < 30) extraAchievements.push("speed_note");
  if (input.type === "quiz" && (input.quizScore ?? 0) === 100) extraAchievements.push("quiz_perfect");
  if (input.type === "focus" && (input.minutesStudied ?? 0) >= 60) extraAchievements.push("focus_60");

  const unlockedExtra = [];
  for (const achievement of extraAchievements) {
    const details = await unlockAchievement(input.userId, achievement);
    if (details) unlockedExtra.push(toAchievementPayload(achievement));
  }

  if (unlockedExtra.length > 0) {
    const extraXp = unlockedExtra.reduce((sum, item) => sum + (item.xp ?? 0), 0);
    const xpUser = await UserModel.findById(input.userId);
    if (xpUser) {
      const totalXP = (xpUser.totalXP ?? xpUser.xp ?? 0) + extraXp;
      Object.assign(xpUser, syncLegacyXpFields(totalXP));
      await xpUser.save();
    }
  }

  return {
    xpGained: totalXpEarned + unlockedExtra.reduce((sum, item) => sum + (item.xp ?? 0), 0),
    levelUp: { happened: finalLevel > previousLevel, from: previousLevel, to: finalLevel },
    newAchievements: [...unlocked, ...unlockedExtra],
    streakUpdated: { previous: previousStreak, current: user.streak },
    streakBroken,
    streakMilestone
  };
}

export async function usersForStreakRisk() {
  const users = await UserModel.find({ streak: { $gt: 0 } })
    .select("email streak _id lastActive lastStreakRiskReminderDay")
    .lean();

  const todayKey = utcDayKey();
  const yesterdayKey = utcDayKey(subDays(new Date(), 1));

  return users
    .filter((user) => Boolean(user.email))
    .flatMap((user) => {
      const lastKey = user.lastActive ? utcDayKey(new Date(user.lastActive)) : null;
      if (user.lastStreakRiskReminderDay === todayKey) return [];
      if (lastKey === yesterdayKey) {
        return [{ userId: user._id.toString(), email: user.email!, streak: user.streak, dayKey: todayKey }];
      }
      return [];
    });
}

export async function usersForStreakBreak() {
  const users = await UserModel.find({ streak: { $gt: 0 } })
    .select("email streak _id lastActive lastStreakBreakNoticeDay")
    .lean();

  const todayKey = utcDayKey();
  const yesterdayKey = utcDayKey(subDays(new Date(), 1));

  return users
    .filter((user) => Boolean(user.email))
    .flatMap((user) => {
      const lastKey = user.lastActive ? utcDayKey(new Date(user.lastActive)) : null;
      if (user.lastStreakBreakNoticeDay === todayKey) return [];
      if (lastKey && lastKey !== todayKey && lastKey !== yesterdayKey) {
        return [{ userId: user._id.toString(), email: user.email!, streak: user.streak, dayKey: todayKey }];
      }
      return [];
    });
}

export async function markAchievementReminder(userId: string, field: "lastStreakRiskReminderDay" | "lastStreakBreakNoticeDay", dayKey: string) {
  await UserModel.updateOne({ _id: userId }, { $set: { [field]: dayKey } });
}

export async function markDailyReminderDay(userId: string, dayKey: string) {
  await UserModel.updateOne({ _id: userId }, { $set: { lastDailyReminderDay: dayKey } });
}

export async function getUpcomingExamCount(userId: string) {
  return ExamModel.countDocuments({ userId, examDate: { $gte: new Date() } });
}
