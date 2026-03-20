"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IconCalendarCheck, IconCircleCheckFilled, IconPlus, IconTrash } from "@tabler/icons-react";
import { usePlanner } from "@/hooks/usePlanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SUBJECTS, SUBJECT_COLOR_VALUES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface SubjectInput {
  name: string;
  examDate: string;
  importance: number;
}

function subjectTone(subject: string) {
  const color = SUBJECT_COLOR_VALUES[subject] ?? SUBJECT_COLOR_VALUES.Other;
  return {
    backgroundColor: `${color}1F`,
    borderColor: `${color}55`,
    color
  };
}

export function PlannerView() {
  const [plannerName, setPlannerName] = useState("");
  const [subjects, setSubjects] = useState<SubjectInput[]>([{ name: "Mathematics", examDate: "", importance: 3 }]);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [startDate, setStartDate] = useState("");
  const { plans, selectedPlan, plan, loading, bootstrapping, generate, selectPlan, removePlan, updateSelectedPlan } = usePlanner();

  useEffect(() => {
    setStartDate(new Date().toISOString().slice(0, 10));
  }, []);

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

  async function createPlan() {
    const data = await generate({ name: plannerName, subjects, hoursPerDay, startDate });
    if (!data?.success) {
      toast.error(data?.error ?? "Unable to generate plan");
      return;
    }
    toast.success("Plan generated and saved");
    for (const achievement of data.events?.newAchievements ?? []) {
      toast.success(`Achievement unlocked: ${achievement.title}`);
    }
    window.dispatchEvent(new CustomEvent("tour:planner-generated"));
    setPlannerName("");
  }

  function fillExamplePlan() {
    const todayDate = new Date();
    const inTenDays = new Date(todayDate);
    inTenDays.setDate(todayDate.getDate() + 10);
    const inEighteenDays = new Date(todayDate);
    inEighteenDays.setDate(todayDate.getDate() + 18);

    setPlannerName("Board Exam Sprint");
    setHoursPerDay(4);
    setStartDate(todayDate.toISOString().slice(0, 10));
    setSubjects([
      { name: "Mathematics", examDate: inTenDays.toISOString().slice(0, 10), importance: 5 },
      { name: "Physics", examDate: inEighteenDays.toISOString().slice(0, 10), importance: 4 }
    ]);
  }

  async function toggleTask(date: string, taskIndex: number, completed: boolean) {
    if (!selectedPlan?._id) return;

    const response = await fetch("/api/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: selectedPlan._id, date, taskIndex, completed })
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not update task");
      return;
    }

    if (data.selectedPlan) {
      updateSelectedPlan(data.selectedPlan);
    }

    if (data.events?.levelUp?.happened) {
      toast.success(`Level up! Level ${data.events.levelUp.to}`);
    }
    if (data.events?.streakUpdated?.current > data.events?.streakUpdated?.previous) {
      toast.success("Streak increased");
    }
    if (data.events?.streakMilestone?.happened && data.events?.streakMilestone?.milestone) {
      toast.success(`${data.events.streakMilestone.milestone}-day streak reached`);
    }
    for (const achievement of data.events?.newAchievements ?? []) {
      toast.success(`Achievement unlocked: ${achievement.title}`);
    }

    if (completed) {
      window.dispatchEvent(new CustomEvent("tour:planner-task-completed"));
    }
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

  if (bootstrapping) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
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
      <div className="glass-card p-6">
        <p className="surface-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          <IconCalendarCheck className="h-3.5 w-3.5 text-[#7B6CF6]" />
          Planner setup
        </p>
        <div className="mb-4">
          <h3 className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Build a plan</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Set a plan name, choose subjects and exam dates, then let StudyOS arrange a week-by-week schedule for calmer revision.
          </p>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Plan name</label>
              <Button data-tour-id="planner-example-fill" type="button" variant="ghost" size="sm" onClick={fillExamplePlan}>
                Use Example
              </Button>
            </div>
            <Input
              data-tour-id="planner-name-input"
              placeholder="Midterm Recovery Plan"
              value={plannerName}
              onChange={(event) => setPlannerName(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">Hours/day</label>
            <Input type="number" min={1} max={16} value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">Start date</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="hidden items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--tertiary-foreground)] md:grid md:grid-cols-[1.1fr_1fr_1fr_auto]">
            <span>Subject</span>
            <span>Exam date</span>
            <span>Priority (1-5)</span>
            <span>Action</span>
          </div>
          {subjects.map((subject, index) => (
            <div key={index} className="surface-card grid gap-2 rounded-[22px] p-3 md:grid-cols-[1.1fr_1fr_1fr_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-foreground)] md:hidden">Subject</label>
                <Select
                  value={subject.name}
                  onChange={(event) =>
                    setSubjects((prev) => prev.map((item, idx) => (idx === index ? { ...item, name: event.target.value } : item)))
                  }
                >
                  {SUBJECTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-foreground)] md:hidden">Exam date</label>
                <Input
                  type="date"
                  value={subject.examDate}
                  onChange={(event) =>
                    setSubjects((prev) => prev.map((item, idx) => (idx === index ? { ...item, examDate: event.target.value } : item)))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--muted-foreground)] md:hidden">Priority (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={subject.importance}
                  placeholder="1 low - 5 high"
                  onChange={(event) =>
                    setSubjects((prev) => prev.map((item, idx) => (idx === index ? { ...item, importance: Number(event.target.value) } : item)))
                  }
                />
                <p className="px-1 text-[11px] leading-4 text-[var(--tertiary-foreground)]">1 = lower priority, 5 = highest priority</p>
              </div>
              <div className="flex items-start md:items-center">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSubjects((prev) => prev.filter((_, idx) => idx !== index))}
                  className="min-h-9 rounded-[16px] border border-[color:var(--control-border)] px-3 text-[#9F1239] hover:bg-[#FECDD3]/25 hover:text-[#9F1239] md:justify-center"
                >
                  <IconTrash className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => setSubjects((prev) => [...prev, { name: "Physics", examDate: "", importance: 3 }])}
              className="gap-1.5"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Add subject
            </Button>
            <Button data-tour-id="planner-generate-plan" onClick={createPlan} disabled={loading}>
              {loading ? "Generating..." : "Generate Plan"}
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Your plans</h3>
        {plans.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">No saved plan yet.</p>
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
        <EmptyState title="No active plan selected" description="Generate a new planner or pick one from your saved plans." />
      ) : (
        <div className="space-y-4">
          <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <p className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">{selectedPlan.name}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {planProgress.completedTasks}/{planProgress.totalTasks} tasks completed ({planProgress.completionRate}%)
              </p>
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

          <div className="glass-card p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Week view</p>
                <h4 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Study grid</h4>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">Scroll horizontally to review the full plan.</p>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-4">
                {plan.map((day, dayIndex) => {
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
                          const tone = subjectTone(task.subject);
                          return (
                            <label
                              key={`${day.date}-${taskIndex}`}
                              className="flex items-start gap-3 rounded-[20px] border p-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                              style={
                                task.completed
                                  ? { backgroundColor: "#6EE7B726", borderColor: "#6EE7B766", color: "#0F766E" }
                                  : tone
                              }
                            >
                              <input
                                data-tour-id={dayIndex === 0 && taskIndex === 0 ? "planner-first-task-checkbox" : undefined}
                                type="checkbox"
                                checked={Boolean(task.completed)}
                                onChange={(event) => {
                                  void toggleTask(day.date, taskIndex, event.target.checked);
                                }}
                                className="mt-1 h-4 w-4 rounded border-white/70"
                              />
                              <span className="flex-1">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  {task.completed ? <IconCircleCheckFilled className="h-3.5 w-3.5" /> : null}
                                  {task.subject}
                                </span>
                                <span className="mt-1 block text-sm leading-6">{task.topic}</span>
                                <span className="surface-pill mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.1em]">
                                  {task.type} • {task.duration}m
                                </span>
                              </span>
                            </label>
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
