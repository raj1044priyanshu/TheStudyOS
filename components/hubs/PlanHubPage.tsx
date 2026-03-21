"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCalendarStats, IconClockHour4, IconRepeat } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PlannerView } from "@/components/planner/PlannerView";
import { ExamsPage } from "@/components/exams/ExamsPage";
import { DailyBriefPanel } from "@/components/dashboard/DailyBriefPanel";

interface ExamRecord {
  _id: string;
  isPast: boolean;
}

export function PlanHubPage() {
  const [upcomingExams, setUpcomingExams] = useState(0);
  const [revisionDueCount, setRevisionDueCount] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState(0);

  useEffect(() => {
    async function load() {
      const [examsResponse, revisionResponse, briefResponse] = await Promise.all([
        fetch("/api/exams", { cache: "no-store" }),
        fetch("/api/revision/due", { cache: "no-store" }),
        fetch("/api/brief", { cache: "no-store" })
      ]);

      const examsPayload = (await examsResponse.json().catch(() => ({}))) as { exams?: ExamRecord[] };
      const revisionPayload = (await revisionResponse.json().catch(() => ({}))) as { due?: unknown[]; items?: unknown[] };
      const briefPayload = (await briefResponse.json().catch(() => ({}))) as { todayPlan?: Array<{ duration: number }> };

      setUpcomingExams((examsPayload.exams ?? []).filter((exam) => !exam.isPast).length);
      setRevisionDueCount((revisionPayload.due ?? revisionPayload.items ?? []).length);
      setPlannedMinutes((briefPayload.todayPlan ?? []).reduce((total, item) => total + (item.duration ?? 0), 0));
    }

    void load();
  }, []);

  const stats = useMemo(
    () => [
      { icon: IconCalendarStats, label: `${upcomingExams} exams upcoming` },
      { icon: IconRepeat, label: `${revisionDueCount} revision items due today` },
      { icon: IconClockHour4, label: `${(plannedMinutes / 60).toFixed(plannedMinutes >= 60 ? 1 : 0)}h planned today` }
    ],
    [plannedMinutes, revisionDueCount, upcomingExams]
  );

  return (
    <HubLayout
      phase="plan"
      title="Plan"
      subtitle="Organise before you study. Students who plan outperform those who don't, consistently."
      stats={stats}
      defaultTab="planner"
      tabs={[
        { id: "planner", icon: IconCalendarStats, label: "Study Planner", component: <PlannerView /> },
        { id: "exams", icon: IconClockHour4, label: "Exams", component: <ExamsPage /> },
        { id: "daily-brief", icon: IconRepeat, label: "Daily Brief", component: <DailyBriefPanel /> }
      ]}
    />
  );
}
