"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  IconArrowRight,
  IconBook2,
  IconBrain,
  IconCalendarWeek,
  IconChartBar,
  IconRepeat,
  IconUsers
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import { getHubHref } from "@/lib/hubs";

interface DashboardPayload {
  profile: {
    name: string;
  };
  stats: {
    streak: number;
    totalNotesGenerated: number;
    totalQuizzesTaken: number;
    studyMinutesWeek: number;
  };
}

interface BriefPayload {
  dateLabel: string;
  todayPlan: Array<{ subject: string; topic: string; duration: number }>;
}

interface RevisionDueItem {
  _id: string;
  topic: string;
  subject: string;
  nextReviewDate: string;
}

interface QuizSummary {
  _id: string;
  topic: string;
  subject: string;
  score: number | null;
  hasAutopsy: boolean;
}

interface ExamRecord {
  _id: string;
  subject: string;
  examName: string;
  examDate: string;
  readiness: number;
  daysUntil: number;
  isPast: boolean;
}

const PHASE_CARD_CONFIG = [
  { phase: "plan", label: "Plan", icon: IconCalendarWeek, description: "Organise time, exams, and what matters first." },
  { phase: "study", label: "Study", icon: IconBook2, description: "Learn the topic with notes, doubts, videos, and focus." },
  { phase: "test", label: "Test", icon: IconBrain, description: "Check recall after every study session." },
  { phase: "revise", label: "Revise", icon: IconRepeat, description: "Keep knowledge active with revision and connections." },
  { phase: "track", label: "Track", icon: IconChartBar, description: "Review patterns, readiness, and progress." }
] as const;

export function DashboardHome() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [brief, setBrief] = useState<BriefPayload | null>(null);
  const [revisionDue, setRevisionDue] = useState<RevisionDueItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [roomCode, setRoomCode] = useState("");
  const [roomActionLoading, setRoomActionLoading] = useState<"create" | "join" | null>(null);

  useEffect(() => {
    async function load() {
      const [dashboardResponse, briefResponse, revisionResponse, quizResponse, examsResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/brief", { cache: "no-store" }),
        fetch("/api/revision/due", { cache: "no-store" }),
        fetch("/api/quiz", { cache: "no-store" }),
        fetch("/api/exams", { cache: "no-store" })
      ]);

      const dashboardPayload = (await dashboardResponse.json().catch(() => null)) as DashboardPayload | null;
      const briefPayload = (await briefResponse.json().catch(() => null)) as BriefPayload | null;
      const revisionPayload = (await revisionResponse.json().catch(() => ({}))) as { due?: RevisionDueItem[]; items?: RevisionDueItem[] };
      const quizPayload = (await quizResponse.json().catch(() => ({}))) as { quizzes?: QuizSummary[] };
      const examsPayload = (await examsResponse.json().catch(() => ({}))) as { exams?: ExamRecord[] };

      if (dashboardResponse.ok && dashboardPayload) {
        setDashboard(dashboardPayload);
      }
      if (briefResponse.ok && briefPayload) {
        setBrief(briefPayload);
      }
      setRevisionDue(revisionPayload.due ?? revisionPayload.items ?? []);
      setQuizzes(quizPayload.quizzes ?? []);
      setExams((examsPayload.exams ?? []).filter((exam) => !exam.isPast));
    }

    void load();
  }, []);

  const preferredName = useMemo(() => {
    const raw = dashboard?.profile.name?.trim() ?? "there";
    return raw.split(/\s+/)[0] || raw;
  }, [dashboard?.profile.name]);

  const priorityCards = useMemo(() => {
    const cards: Array<{ title: string; description: string; href: string }> = [];
    const recentWeakQuiz = quizzes.find((quiz) => quiz.score !== null && quiz.score < 70 && !quiz.hasAutopsy);

    if (revisionDue.length > 0) {
      cards.push({
        title: `${revisionDue.length} topics due for revision`,
        description: "Clear your due queue first so yesterday’s study does not fade.",
        href: getHubHref("revise", "revision-queue")
      });
    }

    if (recentWeakQuiz) {
      cards.push({
        title: `You scored ${recentWeakQuiz.score}% on ${recentWeakQuiz.topic}`,
        description: "Use the autopsy to see exactly why the score slipped.",
        href: `/dashboard/quiz/${recentWeakQuiz._id}/autopsy`
      });
    }

    if (brief?.todayPlan?.length) {
      const firstTask = brief.todayPlan[0];
      cards.push({
        title: `Today: ${firstTask.subject} — ${firstTask.topic}`,
        description: "Start the first planned study block while the day is still open.",
        href: `/dashboard/study?tool=notes&topic=${encodeURIComponent(firstTask.topic)}&subject=${encodeURIComponent(firstTask.subject)}`
      });
    } else if (!brief?.todayPlan?.length) {
      cards.push({
        title: "No study plan yet",
        description: "Set up a plan before the day gets scattered.",
        href: "/dashboard/plan"
      });
    }

    if (cards.length === 0) {
      cards.push({
        title: "Generate your first note",
        description: "Start with one topic and let the rest of the system build from there.",
        href: getHubHref("study", "notes")
      });
    }

    return cards.slice(0, 3);
  }, [brief?.todayPlan, quizzes, revisionDue.length]);

  async function createRoom() {
    setRoomActionLoading("create");
    const response = await fetch("/api/study-room/create", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setRoomActionLoading(null);
    if (!response.ok) {
      toast.error(data.error ?? "Could not create room");
      return;
    }
    router.push(`/dashboard/study-room?roomCode=${encodeURIComponent(data.roomCode)}`);
  }

  async function joinRoom() {
    if (!roomCode.trim()) {
      return;
    }
    setRoomActionLoading("join");
    const response = await fetch("/api/study-room/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase() })
    });
    const data = await response.json().catch(() => ({}));
    setRoomActionLoading(null);
    if (!response.ok) {
      toast.error(data.error ?? "Could not join room");
      return;
    }
    router.push(`/dashboard/study-room?roomCode=${encodeURIComponent(roomCode.trim().toUpperCase())}`);
  }

  const phaseStats = {
    plan: `${exams.length} exams upcoming`,
    study: `${dashboard?.stats.totalNotesGenerated ?? 0} notes generated`,
    test: `${dashboard?.stats.totalQuizzesTaken ?? 0} quizzes taken`,
    revise: `${revisionDue.length} items due`,
    track: `${dashboard?.stats.streak ?? 0} day streak`
  } as const;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="glass-card rounded-[28px] p-5 sm:p-6 md:p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Home</p>
        <h1 className="mt-2 font-headline text-[clamp(2rem,6vw,3rem)] tracking-[-0.05em] text-[var(--foreground)]">
          Good morning, {preferredName}
        </h1>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">{brief?.dateLabel ?? "Your workspace is loading."}</p>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Priority</p>
          <h2 className="mt-2 font-headline text-[clamp(2rem,5vw,2.7rem)] tracking-[-0.03em] text-[var(--foreground)]">Where to start today</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {priorityCards.map((card) => (
            <Link key={card.title} href={card.href} className="glass-card surface-card-hover rounded-[28px] p-5 transition">
              <p className="font-headline text-[clamp(1.9rem,5vw,2.4rem)] tracking-[-0.03em] text-[var(--foreground)]">{card.title}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{card.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#7B6CF6]">
                Open <IconArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {PHASE_CARD_CONFIG.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.phase}
              id={item.phase === "plan" ? "phase-card-plan" : item.phase === "study" ? "phase-card-study" : item.phase === "test" ? "phase-card-test" : item.phase === "revise" ? "phase-card-revise" : "phase-card-track"}
              href={item.phase === "track" ? "/dashboard/track" : `/dashboard/${item.phase}`}
              className="glass-card surface-card-hover rounded-[28px] p-5 transition"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#7B6CF6]/12 text-[#7B6CF6]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-headline text-[clamp(1.8rem,4vw,2.3rem)] tracking-[-0.03em] text-[var(--foreground)]">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
              <p className="mt-4 text-sm font-medium text-[#7B6CF6]">{phaseStats[item.phase]}</p>
            </Link>
          );
        })}
      </section>

      <section id="exam-countdown-widget" className="glass-card rounded-[30px] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Deadlines</p>
            <h2 className="mt-2 font-headline text-[clamp(2rem,5vw,2.7rem)] tracking-[-0.03em] text-[var(--foreground)]">Exam Countdown</h2>
          </div>
          <Link href={getHubHref("plan", "exams")} className="text-sm font-medium text-[#7B6CF6]">
            View all
          </Link>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {exams.length ? (
            exams.slice(0, 8).map((exam) => {
              const color = SUBJECT_COLOR_VALUES[exam.subject] ?? SUBJECT_COLOR_VALUES.Other;
              return (
                <Link
                  key={exam._id}
                  href={getHubHref("plan", "exams")}
                  className="surface-card min-w-[190px] rounded-[22px] border px-4 py-4"
                  style={{ borderColor: `${color}55` }}
                >
                  <p className="font-medium text-[var(--foreground)]">{exam.subject}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{exam.examName}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${color}18`, color }}>
                      {Math.max(0, exam.daysUntil)} days
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{exam.readiness}% ready</span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="surface-card rounded-[22px] p-4 text-sm text-[var(--muted-foreground)]">No exams added yet.</div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-[30px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Collaboration</p>
            <h2 className="mt-2 font-headline text-[clamp(2rem,5vw,2.7rem)] tracking-[-0.03em] text-[var(--foreground)]">Study with Friends</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Create a room, share the code, and continue in the full study room workspace.
            </p>
          </div>
          <Link href="/dashboard/study-room" className="text-sm font-medium text-[#7B6CF6]">
            Open Room
          </Link>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr_auto]">
          <Button onClick={() => void createRoom()} disabled={roomActionLoading !== null} className="gap-2">
            <IconUsers className="h-4 w-4" />
            {roomActionLoading === "create" ? "Creating..." : "Create Room"}
          </Button>
          <Input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Enter room code" maxLength={6} />
          <Button variant="outline" onClick={() => void joinRoom()} disabled={roomActionLoading !== null || !roomCode.trim()}>
            {roomActionLoading === "join" ? "Joining..." : "Join Room"}
          </Button>
        </div>
      </section>
    </div>
  );
}
