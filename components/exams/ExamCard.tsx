"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import { getHubHref } from "@/lib/hubs";

interface PanicPlanDay {
  date: string;
  sessions: Array<{ time: "morning" | "afternoon" | "evening"; topic: string; technique: string; duration: number }>;
}

interface ExamCardProps {
  exam: {
    _id: string;
    subject: string;
    examName: string;
    examDate: string;
    board?: string;
    readiness: number;
    daysUntil: number;
    isPast: boolean;
  };
  onDeleted?: () => void;
}

function getCountdown(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((diff / (60 * 1000)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { diff, days, hours, minutes, seconds };
}

export function ExamCard({ exam, onDeleted }: ExamCardProps) {
  const [countdown, setCountdown] = useState(() => getCountdown(exam.examDate));
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicPlan, setPanicPlan] = useState<PanicPlanDay[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setCountdown(getCountdown(exam.examDate)), 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [exam.examDate]);

  const color = SUBJECT_COLOR_VALUES[exam.subject] ?? SUBJECT_COLOR_VALUES.Other;
  const readinessColor = exam.readiness <= 30 ? "#EF4444" : exam.readiness <= 70 ? "#F59E0B" : "#34D399";
  const countdownText = useMemo(() => {
    if (exam.isPast) return "Completed";
    if (countdown.days === 0 && countdown.diff > 0) {
      return `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
    }
    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
  }, [countdown, exam.isPast]);

  async function loadPanicPlan() {
    setLoadingPlan(true);
    const response = await fetch(`/api/exams/${exam._id}/panic-plan`, { method: "POST" });
    const data = await response.json();
    setLoadingPlan(false);
    if (response.ok) {
      setPanicPlan(data.plan ?? []);
      setPanicOpen(true);
    }
  }

  async function deleteExam() {
    const response = await fetch(`/api/exams/${exam._id}`, { method: "DELETE" });
    if (response.ok) {
      onDeleted?.();
    }
  }

  return (
    <>
      <div className="glass-card rounded-[28px] p-5">
        <div className="flex items-start gap-4">
          <span className="h-20 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">{exam.subject}</h3>
              {exam.board ? <span className="rounded-full bg-[color:var(--surface-low)] px-3 py-1 text-xs text-[var(--muted-foreground)]">{exam.board}</span> : null}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{exam.examName}</p>
            <p
              className={`mt-4 font-headline text-[2.3rem] tracking-[-0.05em] ${exam.daysUntil < 3 && !exam.isPast ? "animate-pulse text-[#EF4444]" : "text-[var(--foreground)]"}`}
            >
              {countdownText}
            </p>
          </div>

          {!exam.isPast ? (
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="rgba(148,163,184,0.22)" strokeWidth="5" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={readinessColor}
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={163}
                  strokeDashoffset={163 - (163 * exam.readiness) / 100}
                />
              </svg>
              <span className="absolute text-xs font-semibold text-[var(--foreground)]">{exam.readiness}%</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {exam.readiness < 30 && exam.daysUntil < 4 && !exam.isPast ? (
            <Button onClick={() => void loadPanicPlan()} disabled={loadingPlan}>
              Panic Mode
            </Button>
          ) : null}
          <Link
            href={`${getHubHref("plan", "planner")}&prefill=exam&examId=${encodeURIComponent(exam._id)}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            View Plan
          </Link>
          <Button variant="ghost" onClick={deleteExam}>
            Delete
          </Button>
        </div>
      </div>

      <Dialog
        open={panicOpen}
        onClose={() => setPanicOpen(false)}
        title="Emergency Crash Plan"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Link
              href={`${getHubHref("plan", "planner")}&prefill=exam&examId=${encodeURIComponent(exam._id)}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Add to Planner
            </Link>
            <Button onClick={() => setPanicOpen(false)}>Close</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {panicPlan.map((day) => (
            <div key={day.date} className="surface-card rounded-[22px] p-4">
              <p className="font-semibold text-[var(--foreground)]">{day.date}</p>
              <div className="mt-3 space-y-2">
                {day.sessions.map((session, index) => (
                  <div key={`${day.date}-${session.time}-${index}`} className="rounded-[18px] border border-[color:var(--panel-border)] px-3 py-3 text-sm">
                    <p className="font-medium capitalize text-[var(--foreground)]">{session.time}</p>
                    <p className="mt-1 text-[var(--foreground)]">{session.topic}</p>
                    <p className="mt-1 text-[var(--muted-foreground)]">
                      {session.technique} • {session.duration} min
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
}
