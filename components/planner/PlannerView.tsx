"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconCircleCheckFilled, IconPlayerPlay, IconTrash } from "@tabler/icons-react";
import { usePlanner } from "@/hooks/usePlanner";
import { Button } from "@/components/ui/button";
import { queueCelebrationsFromGamification } from "@/lib/client-celebrations";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlannerSetupPanel } from "@/components/planner/PlannerSetupPanel";
import { buildPlannerAssessmentHref } from "@/lib/planner-utils";
import type { PlannerDetails, StudyTask } from "@/types";

export function PlannerView() {
  const router = useRouter();
  const { plans, selectedPlan, plan, loading, bootstrapping, generate, selectPlan, removePlan, updateSelectedPlan } = usePlanner();

  const planProgress = useMemo(() => {
    const totalTasks = plan.reduce((acc, day) => acc + day.tasks.length, 0);
    const completedTasks = plan.reduce((acc, day) => acc + day.tasks.filter((task) => task.completed).length, 0);
    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
    };
  }, [plan]);

  const today = new Date().toISOString().slice(0, 10);
  const checkpointEnabled = Boolean(selectedPlan?.exams?.length);

  async function openAssessment(activePlan: PlannerDetails, task: StudyTask, dayDate: string, taskIndex: number) {
    const response = await fetch("/api/planner/checkpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: activePlan._id,
        date: dayDate,
        taskIndex,
        board: activePlan.studyContext?.board,
        className: activePlan.studyContext?.className,
        stream: activePlan.studyContext?.stream
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.checkpoint?._id) {
      toast.error(data.error ?? `Could not open the assessment for ${task.chapter ?? task.topic}`);
      return;
    }

    router.push(buildPlannerAssessmentHref(data.checkpoint._id));
  }

  async function toggleTask(date: string, taskIndex: number, completed: boolean) {
    if (!selectedPlan?._id) return;

    const response = await fetch("/api/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: selectedPlan._id, date, taskIndex, completed, action: "toggle-complete" })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.selectedPlan) {
        updateSelectedPlan(data.selectedPlan);
      }
      if (data.reason === "checkpoint_required" && data.redirectTo) {
        router.push(data.redirectTo);
        return;
      }
      toast.error(data.error ?? "Could not update task");
      return;
    }

    if (data.selectedPlan) {
      updateSelectedPlan(data.selectedPlan);
    }
    queueCelebrationsFromGamification(data.events, "planner-task");
  }

  async function deleteCurrentPlan() {
    if (!selectedPlan?._id) return;
    const ok = await removePlan(selectedPlan._id);
    if (!ok) {
      toast.error("Unable to delete plan");
      return;
    }
    toast.success("Plan deleted");
  }

  function renderTaskControls(dayDate: string, taskIndex: number, task: StudyTask, activePlan: PlannerDetails) {
    if (task.type === "break") {
      return (
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            checked={Boolean(task.completed)}
            onChange={(event) => {
              void toggleTask(dayDate, taskIndex, event.target.checked);
            }}
            className="h-4 w-4 rounded border-white/70"
          />
          Mark break complete
        </label>
      );
    }

    if (!checkpointEnabled || !activePlan.exams?.length) {
      return (
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            checked={Boolean(task.completed)}
            onChange={(event) => {
              void toggleTask(dayDate, taskIndex, event.target.checked);
            }}
            className="h-4 w-4 rounded border-white/70"
          />
          Mark complete
        </label>
      );
    }

    if (task.completed || task.checkpointStatus === "passed") {
      return (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#6EE7B7]/16 px-3 py-1.5 text-xs font-medium text-[#047857]">
          <IconCircleCheckFilled className="h-3.5 w-3.5" />
          Chapter cleared{typeof task.checkpointScore === "number" ? ` • ${task.checkpointScore}%` : ""}
        </div>
      );
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void openAssessment(activePlan, task, dayDate, taskIndex)}
        >
          {task.checkpointStatus === "revise_again" ? "Retry assessment" : "Open assessment"}
        </Button>
        {task.checkpointStatus === "revise_again" ? (
          <span className="inline-flex items-center rounded-full bg-[#FCA5A5]/14 px-3 py-1.5 text-xs font-medium text-[#B91C1C]">
            Revise and retry
          </span>
        ) : null}
      </div>
    );
  }

  if (bootstrapping) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PlannerSetupPanel loading={loading} onGenerate={generate} />

      <div className="glass-card p-5 sm:p-6">
        <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Saved schedules</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Generate a new study plan without losing older schedules, then switch between them here.
        </p>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">No saved schedule yet.</p>
        ) : (
          <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1">
            {plans.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => void selectPlan(item._id)}
                className={`min-w-[240px] snap-start rounded-2xl border p-3 text-left transition ${
                  selectedPlan?._id === item._id
                    ? "border-transparent bg-[#7B6CF6] text-white shadow-[0_10px_22px_rgba(123,108,246,0.28)]"
                    : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--foreground)] hover:bg-[color:var(--surface-panel-hover)]"
                }`}
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs opacity-80">{item.totalDays} days</p>
                <p className="text-xs opacity-80">{item.completionRate}% completed</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedPlan ? (
        <EmptyState title="No active plan selected" description="Generate a new chapter schedule or pick one from your saved schedules." />
      ) : (
        <div className="space-y-4">
          <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div>
              <p className="font-headline text-[clamp(2rem,5vw,2.6rem)] tracking-[-0.03em] text-[var(--foreground)]">{selectedPlan.name}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {planProgress.completedTasks}/{planProgress.totalTasks} tasks completed ({planProgress.completionRate}%)
              </p>
              {selectedPlan.studyContext?.board ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                  {selectedPlan.studyContext.className} • {selectedPlan.studyContext.board}
                  {selectedPlan.studyContext.stream ? ` • ${selectedPlan.studyContext.stream}` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="surface-pill rounded-full px-4 py-2 text-sm text-[var(--muted-foreground)]">
                {selectedPlan.totalDays} days
              </div>
              <div className="surface-pill rounded-full px-4 py-2 text-sm text-[var(--muted-foreground)]">
                {selectedPlan.subjects.length} subjects
              </div>
              <Button variant="outline" className="gap-1.5" onClick={deleteCurrentPlan}>
                <IconTrash className="h-3.5 w-3.5" />
                Delete Plan
              </Button>
            </div>
          </div>

          <div id="planner-calendar" className="glass-card p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Week view</p>
                <h4 className="mt-2 font-headline text-[clamp(2rem,5vw,2.5rem)] tracking-[-0.03em] text-[var(--foreground)]">Study grid</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-[var(--muted-foreground)]">Chapter completion unlocks only after passing the linked assessment.</p>
                <Link id="focus-room-link" href="/dashboard/study?tool=focus-room" className="text-sm font-medium text-[#7B6CF6]">
                  <span className="inline-flex items-center gap-1.5">
                    <IconPlayerPlay className="h-3.5 w-3.5" />
                    Start Focus Session
                  </span>
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4">
                {plan.map((day) => {
                  const isToday = day.date === today;
                  return (
                    <div
                      key={day.date}
                      className={`glass-card min-h-[320px] p-4 transition ${isToday ? "-translate-y-1 shadow-[0_18px_36px_rgba(123,108,246,0.18)] ring-1 ring-[#7B6CF6]/24" : ""}`}
                    >
                      <div className="mb-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                          {isToday ? "Today" : "Day"}
                        </p>
                        <h5 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{day.date}</h5>
                      </div>

                      <div className="space-y-3">
                        {day.tasks.map((task, taskIndex) => {
                          const showCheckpointState = checkpointEnabled && task.type !== "break";
                          return (
                            <div
                              key={`${day.date}-${taskIndex}`}
                              className={`rounded-[20px] border p-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${
                                task.completed
                                  ? "border-[#6EE7B766] bg-[#6EE7B726]"
                                  : "border-[color:var(--panel-border)] bg-[color:var(--surface-low)]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="inline-flex items-center gap-1 font-medium text-[var(--foreground)]">
                                    {task.completed ? <IconCircleCheckFilled className="h-3.5 w-3.5 text-[#047857]" /> : null}
                                    {task.subject}
                                  </span>
                                  {task.examName ? <p className="mt-1 text-xs text-[var(--tertiary-foreground)]">{task.examName}</p> : null}
                                  <span className="mt-1 block text-sm leading-6 text-[var(--foreground)]">{task.topic}</span>
                                </div>
                                <span className="surface-pill inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.1em]">
                                  {task.type} • {task.duration}m
                                </span>
                              </div>

                              {showCheckpointState ? (
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                                  <span className="rounded-full bg-[color:var(--surface-high)] px-3 py-1">
                                    {task.checkpointStatus?.replace(/_/g, " ") ?? "not started"}
                                  </span>
                                  {typeof task.checkpointScore === "number" ? (
                                    <span className="rounded-full bg-[color:var(--surface-high)] px-3 py-1">
                                      {task.checkpointScore}% score
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}

                              {renderTaskControls(day.date, taskIndex, task, selectedPlan)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
