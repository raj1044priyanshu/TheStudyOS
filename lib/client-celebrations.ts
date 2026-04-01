"use client";

import type { AchievementType, GamificationEvent } from "@/types";
import type { CompanionPose } from "@/components/companion/StudyCompanion";

export type CelebrationKind = "streak-broken" | "streak-progress" | "level-up" | "achievement-bundle";

export interface CelebrationAchievement {
  type?: AchievementType | string;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  xp?: number;
}

export interface CelebrationItem {
  id: string;
  kind: CelebrationKind;
  priority: number;
  title: string;
  description: string;
  pose: CompanionPose;
  xpGained?: number;
  level?: {
    from: number;
    to: number;
    name?: string;
  };
  streak?: {
    previous?: number;
    current?: number;
    milestone?: number | null;
  };
  achievements?: CelebrationAchievement[];
  requiresStreakAlertAck?: boolean;
}

export interface DashboardStreakBreakAlert {
  previous: number;
  brokenAt: string | null;
}

export interface AchievementTriggerResponse {
  newAchievements?: CelebrationAchievement[];
  totalXP?: number;
  level?: number;
  levelName?: string;
  levelIcon?: string;
  xpGained?: number;
  previousLevel?: number;
  levelUp?: {
    happened: boolean;
    from: number;
    to: number;
    name?: string;
  };
}

declare global {
  interface Window {
    __studyosCelebrationBusy?: boolean;
  }
}

const CELEBRATION_EVENT = "studyos:celebration-enqueue";

export function getCelebrationBusy() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.__studyosCelebrationBusy);
}

export function queueCelebrationItems(items: CelebrationItem[]) {
  if (typeof window === "undefined" || items.length === 0) {
    return;
  }

  window.dispatchEvent(new CustomEvent<CelebrationItem[]>(CELEBRATION_EVENT, { detail: items }));
}

function bundleTitle(count: number) {
  return count === 1 ? "Achievement unlocked" : `${count} new achievements`;
}

export function queueStreakBreakAlert(alert: DashboardStreakBreakAlert | null) {
  if (!alert) {
    return;
  }

  queueCelebrationItems([
    {
      id: `dashboard-streak-break:${alert.brokenAt ?? alert.previous}`,
      kind: "streak-broken",
      priority: 100,
      pose: "sad-but-supportive",
      title: "Your streak paused",
      description: `That ${alert.previous}-day streak took a break. One small session puts you back in motion today.`,
      streak: {
        previous: alert.previous
      },
      requiresStreakAlertAck: true
    }
  ]);
}

export function queueCelebrationsFromGamification(events: GamificationEvent | null | undefined, source = "activity") {
  if (!events) {
    return;
  }

  const items: CelebrationItem[] = [];

  if (events.streakBroken.happened) {
    items.push({
      id: `${source}:streak-broken:${events.streakBroken.at ?? events.streakBroken.previous}`,
      kind: "streak-broken",
      priority: 100,
      pose: "sad-but-supportive",
      title: "Your streak paused",
      description: `That ${events.streakBroken.previous}-day streak ended, but you are already rebuilding it by showing up now.`,
      streak: {
        previous: events.streakBroken.previous,
        current: events.streakUpdated.current
      }
    });
  }

  if (events.levelUp.happened) {
    items.push({
      id: `${source}:level-up:${events.levelUp.to}`,
      kind: "level-up",
      priority: 90,
      pose: "sparkle",
      title: `Level ${events.levelUp.to} unlocked`,
      description: `You climbed from level ${events.levelUp.from} to level ${events.levelUp.to}. Keep the momentum going.`,
      level: {
        from: events.levelUp.from,
        to: events.levelUp.to
      },
      xpGained: events.xpGained
    });
  }

  if (events.streakMilestone.happened || events.streakUpdated.current > events.streakUpdated.previous) {
    const milestone = events.streakMilestone.milestone;
    const current = events.streakUpdated.current;
    items.push({
      id: `${source}:streak-progress:${milestone ?? current}`,
      kind: "streak-progress",
      priority: 80,
      pose: milestone ? "cheer" : "sparkle",
      title: milestone ? `${milestone}-day streak` : "Streak extended",
      description: milestone
        ? `You reached ${milestone} study days in a row. That is real consistency.`
        : `Your streak moved from ${events.streakUpdated.previous} to ${current} day${current === 1 ? "" : "s"}.`,
      streak: {
        previous: events.streakUpdated.previous,
        current,
        milestone
      },
      xpGained: events.xpGained
    });
  }

  if (events.newAchievements.length > 0) {
    items.push({
      id: `${source}:achievement-bundle:${events.newAchievements.map((item) => item.type).join(",")}`,
      kind: "achievement-bundle",
      priority: 70,
      pose: "cheer",
      title: bundleTitle(events.newAchievements.length),
      description:
        events.newAchievements.length === 1
          ? `${events.newAchievements[0]?.title ?? "A new badge"} just joined your shelf.`
          : "Your hard work stacked up into a fresh bundle of milestones.",
      achievements: events.newAchievements,
      xpGained: events.xpGained
    });
  }

  queueCelebrationItems(items);
}

export function queueCelebrationsFromAchievementResponse(
  response: AchievementTriggerResponse | null | undefined,
  source = "trigger"
) {
  if (!response) {
    return;
  }

  const items: CelebrationItem[] = [];

  const levelUp =
    response.levelUp ??
    (typeof response.level === "number" && typeof response.previousLevel === "number"
      ? {
          happened: response.level > response.previousLevel,
          from: response.previousLevel,
          to: response.level,
          name: response.levelName
        }
      : undefined);

  if (levelUp?.happened) {
    items.push({
      id: `${source}:level-up:${levelUp.to}`,
      kind: "level-up",
      priority: 90,
      pose: "sparkle",
      title: levelUp.name ? `${levelUp.name} reached` : `Level ${levelUp.to} unlocked`,
      description: `You climbed from level ${levelUp.from} to level ${levelUp.to}.`,
      level: {
        from: levelUp.from,
        to: levelUp.to,
        name: levelUp.name
      },
      xpGained: response.xpGained
    });
  }

  if ((response.newAchievements?.length ?? 0) > 0) {
    items.push({
      id: `${source}:achievement-bundle:${response.newAchievements?.map((item) => item.type ?? item.title).join(",")}`,
      kind: "achievement-bundle",
      priority: 70,
      pose: "cheer",
      title: bundleTitle(response.newAchievements?.length ?? 0),
      description:
        response.newAchievements?.length === 1
          ? `${response.newAchievements?.[0]?.title ?? "A new milestone"} is now unlocked.`
          : "You picked up a whole stack of fresh milestones.",
      achievements: response.newAchievements,
      xpGained: response.xpGained
    });
  }

  queueCelebrationItems(items);
}
