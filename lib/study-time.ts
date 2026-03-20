import { Types } from "mongoose";
import { dayKeyInTimeZone, normalizeTimeZone, relativeDayKeyInTimeZone, weekdayInTimeZone } from "@/lib/timezone";
import { StudySessionModel } from "@/models/StudySession";

const MAX_TRACKED_SECONDS_PER_BATCH = 300;

export interface ActiveStudyStats {
  dayKeys: string[];
  dailyMinutes: Array<{ dayKey: string; minutes: number }>;
  todayMinutes: number;
  weekMinutes: number;
  totalMinutes: number;
}

function toObjectId(userId: string) {
  return new Types.ObjectId(userId);
}

export function clampTrackedSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(MAX_TRACKED_SECONDS_PER_BATCH, Math.round(seconds)));
}

export function getRecentDayKeys(date: Date, timeZone: string, count: number) {
  return Array.from({ length: count }, (_, index) => relativeDayKeyInTimeZone(date, index - (count - 1), timeZone));
}

export function getCurrentWeekDayKeys(date: Date, timeZone: string) {
  const weekday = weekdayInTimeZone(date, timeZone);
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return Array.from({ length: daysSinceMonday + 1 }, (_, index) => relativeDayKeyInTimeZone(date, index - daysSinceMonday, timeZone));
}

export async function recordActiveStudyTime({
  userId,
  timezone,
  seconds,
  at = new Date()
}: {
  userId: string;
  timezone: string;
  seconds: number;
  at?: Date;
}) {
  const normalizedSeconds = clampTrackedSeconds(seconds);
  if (!normalizedSeconds) {
    return 0;
  }

  const safeTimeZone = normalizeTimeZone(timezone);
  const dayKey = dayKeyInTimeZone(at, safeTimeZone);

  await StudySessionModel.updateOne(
    { userId, dayKey },
    {
      $setOnInsert: {
        userId,
        dayKey
      },
      $set: {
        timezone: safeTimeZone,
        lastTrackedAt: at
      },
      $inc: {
        activeSeconds: normalizedSeconds
      }
    },
    { upsert: true }
  );

  return normalizedSeconds;
}

export async function getActiveStudyStats({
  userId,
  timezone,
  dayCount = 14,
  at = new Date()
}: {
  userId: string;
  timezone: string;
  dayCount?: number;
  at?: Date;
}): Promise<ActiveStudyStats> {
  const safeTimeZone = normalizeTimeZone(timezone);
  const recentDayKeys = getRecentDayKeys(at, safeTimeZone, dayCount);
  const weekDayKeys = getCurrentWeekDayKeys(at, safeTimeZone);
  const lookupKeys = Array.from(new Set([...recentDayKeys, ...weekDayKeys]));
  const objectUserId = toObjectId(userId);

  const [recentSessions, totalAgg] = await Promise.all([
    StudySessionModel.find({
      userId: objectUserId,
      dayKey: { $in: lookupKeys }
    })
      .select("dayKey activeSeconds")
      .lean(),
    StudySessionModel.aggregate<{ total: number }>([
      { $match: { userId: objectUserId } },
      { $group: { _id: null, total: { $sum: "$activeSeconds" } } }
    ])
  ]);

  const secondsByDay = new Map(recentSessions.map((session) => [session.dayKey, session.activeSeconds ?? 0]));
  const todayKey = dayKeyInTimeZone(at, safeTimeZone);
  const weekSeconds = weekDayKeys.reduce((total, dayKey) => total + (secondsByDay.get(dayKey) ?? 0), 0);
  const totalSeconds = totalAgg[0]?.total ?? 0;

  return {
    dayKeys: recentDayKeys,
    dailyMinutes: recentDayKeys.map((dayKey) => ({
      dayKey,
      minutes: Math.floor((secondsByDay.get(dayKey) ?? 0) / 60)
    })),
    todayMinutes: Math.floor((secondsByDay.get(todayKey) ?? 0) / 60),
    weekMinutes: Math.floor(weekSeconds / 60),
    totalMinutes: Math.floor(totalSeconds / 60)
  };
}
