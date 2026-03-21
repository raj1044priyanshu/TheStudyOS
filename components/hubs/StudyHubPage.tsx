"use client";

import { useEffect, useMemo, useState } from "react";
import { IconBook2, IconClockHour4, IconTargetArrow, IconVideo, IconMessageCircleQuestion, IconScan } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { DoubtsPanel } from "@/components/doubts/DoubtsPanel";
import { FocusRoom } from "@/components/focus/FocusRoom";
import { VideosPanel } from "@/components/videos/VideosPanel";
import { Scanner } from "@/components/scanner/Scanner";

export function StudyHubPage() {
  const [notesCount, setNotesCount] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [topicsThisWeek, setTopicsThisWeek] = useState(0);

  useEffect(() => {
    async function load() {
      const [dashboardResponse, progressResponse, briefResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/progress", { cache: "no-store" }),
        fetch("/api/brief", { cache: "no-store" })
      ]);

      const dashboardPayload = (await dashboardResponse.json().catch(() => ({}))) as { stats?: { totalNotesGenerated?: number } };
      const progressPayload = (await progressResponse.json().catch(() => ({}))) as { stats?: { studyMinutesWeek?: number } };
      const briefPayload = (await briefResponse.json().catch(() => ({}))) as { todayPlan?: Array<{ topic: string }> };

      setNotesCount(dashboardPayload.stats?.totalNotesGenerated ?? 0);
      setWeeklyMinutes(progressPayload.stats?.studyMinutesWeek ?? 0);
      setTopicsThisWeek(new Set((briefPayload.todayPlan ?? []).map((task) => task.topic)).size);
    }

    void load();
  }, []);

  const stats = useMemo(
    () => [
      { icon: IconBook2, label: `${notesCount} notes generated` },
      { icon: IconTargetArrow, label: `${topicsThisWeek} topics studied this week` },
      { icon: IconClockHour4, label: `${(weeklyMinutes / 60).toFixed(weeklyMinutes >= 60 ? 1 : 0)}h in focus sessions` }
    ],
    [notesCount, topicsThisWeek, weeklyMinutes]
  );

  return (
    <HubLayout
      phase="study"
      title="Study"
      subtitle="Generate notes, resolve doubts, and study without distraction."
      stats={stats}
      defaultTab="notes"
      tabs={[
        { id: "notes", icon: IconBook2, label: "Notes", component: <NotesPanel /> },
        { id: "doubts", icon: IconMessageCircleQuestion, label: "Doubts", component: <DoubtsPanel /> },
        { id: "focus-room", icon: IconClockHour4, label: "Focus Room", component: <FocusRoom /> },
        { id: "videos", icon: IconVideo, label: "Videos", component: <VideosPanel /> },
        { id: "scanner", icon: IconScan, label: "Scanner", component: <Scanner /> }
      ]}
    />
  );
}
