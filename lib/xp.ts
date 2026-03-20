import type { LevelDefinition } from "@/types";

export const XP_AWARDS = {
  noteGenerated: 15,
  quizCompleted: 20,
  quizPerfectBonus: 30,
  focusSessionPer25Minutes: 10,
  teachMeCompleted: 25,
  scanCompleted: 10,
  evaluationCompleted: 20,
  revisionItemReviewed: 5,
  dailyLogin: 5
} as const;

export const LEVELS: LevelDefinition[] = [
  { minXp: 0, maxXp: 99, level: 1, name: "Novice", icon: "🌱" },
  { minXp: 100, maxXp: 499, level: 2, name: "Scholar", icon: "📖" },
  { minXp: 500, maxXp: 1999, level: 3, name: "Genius", icon: "💡" },
  { minXp: 2000, maxXp: null, level: 4, name: "Legend", icon: "👑" }
];

export function getLevelFromXp(xp: number) {
  return LEVELS.find((level) => xp >= level.minXp && (level.maxXp === null || xp <= level.maxXp)) ?? LEVELS[0];
}

export function getNextLevel(xp: number) {
  const current = getLevelFromXp(xp);
  return LEVELS.find((level) => level.minXp > current.minXp) ?? null;
}

export function getProgressToNextLevel(xp: number) {
  const current = getLevelFromXp(xp);
  const next = getNextLevel(xp);
  if (!next || current.maxXp === null) {
    return 100;
  }

  const span = next.minXp - current.minXp;
  if (span <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round(((xp - current.minXp) / span) * 100)));
}

export function syncLegacyXpFields(totalXP: number) {
  const level = getLevelFromXp(totalXP);
  return {
    totalXP,
    xp: totalXP,
    level: level.level
  };
}
