"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { IconBook2, IconClockHour4, IconTargetArrow, IconVideo, IconMessageCircleQuestion, IconScan } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { HubPanelFallback } from "@/components/layout/HubPanelFallback";

const NotesPanel = dynamic(() => import("@/components/notes/NotesPanel").then((mod) => mod.NotesPanel), {
  loading: () => <HubPanelFallback text="Loading notes workspace..." />
});
const DoubtsPanel = dynamic(() => import("@/components/doubts/DoubtsPanel").then((mod) => mod.DoubtsPanel), {
  loading: () => <HubPanelFallback text="Loading doubt solver..." />
});
const FocusRoom = dynamic(() => import("@/components/focus/FocusRoom").then((mod) => mod.FocusRoom), {
  loading: () => <HubPanelFallback text="Loading focus room..." />
});
const VideosPanel = dynamic(() => import("@/components/videos/VideosPanel").then((mod) => mod.VideosPanel), {
  loading: () => <HubPanelFallback text="Loading video finder..." />
});
const Scanner = dynamic(() => import("@/components/scanner/Scanner").then((mod) => mod.Scanner), {
  loading: () => <HubPanelFallback text="Loading scanner..." />
});

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
        {
          id: "notes",
          icon: IconBook2,
          label: "Notes",
          description: "Create paper-style study notes, filter your library, and jump back into saved topics quickly.",
          component: <NotesPanel />
        },
        {
          id: "doubts",
          icon: IconMessageCircleQuestion,
          label: "Doubts",
          description: "Use this when one blocked concept is slowing down the rest of your study session.",
          component: <DoubtsPanel />
        },
        {
          id: "focus-room",
          icon: IconClockHour4,
          label: "Focus Room",
          description: "Start a distraction-light study timer with ambient sound and next-step suggestions.",
          component: <FocusRoom />
        },
        {
          id: "videos",
          icon: IconVideo,
          label: "Videos",
          description: "Find visual explanations when reading alone is not enough for the topic.",
          component: <VideosPanel />
        },
        {
          id: "scanner",
          icon: IconScan,
          label: "Scanner",
          description: "Capture physical material and convert it into reusable StudyOS study content.",
          component: <Scanner />
        }
      ]}
    />
  );
}
