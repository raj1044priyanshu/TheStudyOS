"use client";

import toast from "react-hot-toast";
import { AchievementToast } from "@/components/shared/AchievementToast";

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
}

export function showAchievementToasts(achievements: AchievementItem[]) {
  achievements.forEach((achievement, index) => {
    window.setTimeout(() => {
      toast.custom(
        () => (
          <AchievementToast
            icon={achievement.icon ?? "🏆"}
            name={achievement.name ?? achievement.title ?? "Achievement"}
            xp={achievement.xp ?? 0}
            color={achievement.color ?? "#7B6CF6"}
          />
        ),
        {
          id: `achievement-${achievement.id ?? achievement.type ?? achievement.name ?? index}-${Date.now()}`,
          position: "bottom-right",
          duration: 4000
        }
      );
    }, index * 100);
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
    if (response.ok && data.newAchievements?.length) {
      showAchievementToasts(data.newAchievements);
    }
    return data;
  } catch {
    return null;
  }
}
