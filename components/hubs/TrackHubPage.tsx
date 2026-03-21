"use client";

import { useEffect, useMemo, useState } from "react";
import { IconClockHour4, IconFlame, IconTrophy } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { TrackOverview } from "@/components/track/TrackOverview";

export function TrackHubPage() {
  const [streak, setStreak] = useState(0);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [levelName, setLevelName] = useState("Novice");

  useEffect(() => {
    async function load() {
      const [progressResponse, achievementsResponse] = await Promise.all([
        fetch("/api/progress", { cache: "no-store" }),
        fetch("/api/achievements", { cache: "no-store" })
      ]);

      const progressPayload = (await progressResponse.json().catch(() => ({}))) as { stats?: { streak?: number; studyMinutesWeek?: number } };
      const achievementsPayload = (await achievementsResponse.json().catch(() => ({}))) as { progress?: { levelName?: string } };

      setStreak(progressPayload.stats?.streak ?? 0);
      setStudyMinutes(progressPayload.stats?.studyMinutesWeek ?? 0);
      setLevelName(achievementsPayload.progress?.levelName ?? "Novice");
    }

    void load();
  }, []);

  const stats = useMemo(
    () => [
      { icon: IconFlame, label: `${streak} day streak` },
      { icon: IconClockHour4, label: `${(studyMinutes / 60).toFixed(studyMinutes >= 60 ? 1 : 0)}h studied this week` },
      { icon: IconTrophy, label: `${levelName} level` }
    ],
    [levelName, streak, studyMinutes]
  );

  return (
    <HubLayout
      phase="track"
      title="Track"
      subtitle="What gets measured gets improved. Review your patterns weekly to study smarter, not just harder."
      stats={stats}
    >
      <TrackOverview />
    </HubLayout>
  );
}
