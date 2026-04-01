"use client";

import { queueCelebrationsFromAchievementResponse, type AchievementTriggerResponse } from "@/lib/client-celebrations";

interface AchievementItem {
  id?: string;
  type?: string;
  title?: string;
  name?: string;
  icon?: string;
  color?: string;
  xp?: number;
}

interface AchievementResponse {
  newAchievements?: AchievementItem[];
  totalXP?: number;
  level?: number;
  levelName?: string;
  xpGained?: number;
  previousLevel?: number;
  levelUp?: {
    happened: boolean;
    from: number;
    to: number;
    name?: string;
  };
}

export function showAchievementToasts(achievements: AchievementItem[]) {
  queueCelebrationsFromAchievementResponse({
    newAchievements: achievements.map((achievement) => ({
      type: achievement.type,
      title: achievement.name ?? achievement.title,
      description: achievement.title ?? achievement.name,
      icon: achievement.icon,
      color: achievement.color,
      xp: achievement.xp
    }))
  });
}

export async function triggerAchievementCheck(trigger: string) {
  try {
    const response = await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger })
    });
    const data = (await response.json().catch(() => ({}))) as AchievementResponse;
    if (response.ok) {
      queueCelebrationsFromAchievementResponse(data as AchievementTriggerResponse, trigger);
    }
    return data;
  } catch {
    return null;
  }
}
