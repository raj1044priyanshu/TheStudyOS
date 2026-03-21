"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ContextualHint } from "@/components/help/ContextualHint";
import { getHubHref } from "@/lib/hubs";
import type { ContextualHintId } from "@/types";

interface ActiveHint {
  id: ContextualHintId;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

interface QuizSummary {
  _id: string;
  topic: string;
  subject: string;
  score: number | null;
  totalQuestions: number;
  completedAt: string | null;
  hasAutopsy: boolean;
}

interface ExamSummary {
  _id: string;
  subject: string;
  examName: string;
  examDate: string;
  daysUntil: number;
  isPast: boolean;
}

function getIsoWeekendKey(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day + 3);
  const firstThursday = new Date(copy.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week = 1 + Math.round((copy.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${copy.getFullYear()}-${week}`;
}

export function ContextualHintsManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hint, setHint] = useState<ActiveHint | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      setHint(null);

      const showHint = (nextHint: ActiveHint, options?: { onceKey?: string }) => {
        if (cancelled) {
          return;
        }

        if (options?.onceKey) {
          const storageKey = `studyos_hint_once_${options.onceKey}`;
          if (window.localStorage.getItem(storageKey) === "true") {
            return;
          }
          window.localStorage.setItem(storageKey, "true");
        }

        setHint(nextHint);
      };

      if (!pathname.startsWith("/dashboard")) {
        return;
      }

      const activeTool =
        pathname === "/dashboard/study"
          ? searchParams.get("tool") ?? "notes"
          : pathname === "/dashboard/test"
            ? searchParams.get("tool") ?? "quiz"
            : pathname === "/dashboard/revise"
              ? searchParams.get("tool") ?? "revision-queue"
              : pathname === "/dashboard/plan"
                ? searchParams.get("tool") ?? "planner"
                : null;

      const revisionResponse = await fetch("/api/revision/due", { cache: "no-store" }).then((response) => response.json()).catch(() => ({}));
      const revisionItems = (revisionResponse.due ?? revisionResponse.items ?? []) as Array<{ nextReviewDate: string }>;
      const overdueByTwoDays = revisionItems.filter((item) => Date.now() - new Date(item.nextReviewDate).getTime() > 2 * 24 * 60 * 60 * 1000).length;
      if (overdueByTwoDays >= 5) {
        showHint({
          id: "revision_overdue",
          message: `You have ${overdueByTwoDays} topics overdue for revision. 15 minutes now saves hours of cramming later.`,
          ctaLabel: "Review now",
          ctaHref: getHubHref("revise", "revision-queue")
        });
        return;
      }

      if (pathname === "/dashboard/study" && activeTool === "notes") {
        const [notesResponse, quizzesResponse] = await Promise.all([
          fetch("/api/notes", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
          fetch("/api/quiz", { cache: "no-store" }).then((response) => response.json()).catch(() => ({}))
        ]);
        const notes = (notesResponse.notes ?? []) as Array<{ subject: string }>;
        const quizzes = (quizzesResponse.quizzes ?? []) as QuizSummary[];
        const counts = notes.reduce<Record<string, number>>((acc, note) => {
          acc[note.subject] = (acc[note.subject] ?? 0) + 1;
          return acc;
        }, {});
        const subject = Object.entries(counts).find(([candidate, count]) => count >= 3 && !quizzes.some((quiz) => quiz.subject === candidate && quiz.completedAt));
        if (subject) {
          showHint({
            id: "notes_no_quiz",
            message: `You've made ${subject[1]} notes on ${subject[0]} but have not tested yourself yet. Quiz yourself to make sure it is actually sticking.`,
            ctaLabel: "Generate quiz",
            ctaHref: `${getHubHref("test", "quiz")}&subject=${encodeURIComponent(subject[0])}`
          });
        }
        return;
      }

      if (pathname === "/dashboard/test" || pathname === "/dashboard") {
        const quizResponse = await fetch("/api/quiz", { cache: "no-store" }).then((response) => response.json()).catch(() => ({}));
        const quizzes = (quizResponse.quizzes ?? []) as QuizSummary[];
        const needsAutopsy = quizzes.find((quiz) => quiz.score !== null && quiz.score < 80 && !quiz.hasAutopsy);
        if (needsAutopsy) {
          showHint({
            id: "quiz_no_autopsy",
            message: `You scored ${needsAutopsy.score}% on ${needsAutopsy.topic}. Find out exactly why with Exam Autopsy.`,
            ctaLabel: "View autopsy",
            ctaHref: `/dashboard/quiz/${needsAutopsy._id}/autopsy`
          });
          return;
        }
      }

      if (pathname === "/dashboard/revise" && activeTool === "formula-sheet") {
        const [notesResponse, formulaResponse] = await Promise.all([
          fetch("/api/notes", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
          fetch("/api/formula-sheet?subject=all", { cache: "no-store" }).then((response) => response.json()).catch(() => ({}))
        ]);
        const notes = (notesResponse.notes ?? []) as Array<{ subject: string }>;
        const sheets = (formulaResponse.sheets ?? []) as Array<{ subject: string; formulas?: unknown[] }>;
        const noteCounts = notes.reduce<Record<string, number>>((acc, note) => {
          acc[note.subject] = (acc[note.subject] ?? 0) + 1;
          return acc;
        }, {});
        const emptySubject = Object.entries(noteCounts).find(([subject, count]) => {
          const matchingSheet = sheets.find((sheet) => sheet.subject === subject);
          const formulaCount = Array.isArray(matchingSheet?.formulas) ? matchingSheet.formulas.length : 0;
          return count >= 5 && formulaCount === 0;
        });

        if (emptySubject) {
          showHint({
            id: "formula_sheet_empty",
            message: "Your formula sheet is empty. Generate notes with formulas and they will appear here automatically.",
            ctaLabel: "Generate notes",
            ctaHref: `${getHubHref("study", "notes")}&subject=${encodeURIComponent(emptySubject[0])}`
          });
        }
        return;
      }

      if (pathname === "/dashboard") {
        const [profileResponse, scannerResponse, notesResponse, examsResponse, plannerResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
          fetch("/api/scanner", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
          fetch("/api/notes", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
          fetch("/api/exams", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
          fetch("/api/planner", { cache: "no-store" }).then((response) => response.json()).catch(() => ({}))
        ]);

        const profile = profileResponse.profile as { createdAt?: string | null } | undefined;
        const scans = (scannerResponse.scans ?? []) as unknown[];
        const notes = (notesResponse.notes ?? []) as Array<{ topic: string }>;
        const exams = (examsResponse.exams ?? []) as ExamSummary[];
        const selectedPlan = plannerResponse.selectedPlan as { subjects?: Array<{ name: string }> } | null | undefined;
        const plannedSubjects = new Set((selectedPlan?.subjects ?? []).map((item) => item.name));

        const approachingExam = exams.find((exam) => !exam.isPast && exam.daysUntil <= 7 && !plannedSubjects.has(exam.subject));
        if (approachingExam) {
          showHint({
            id: "exam_approaching_no_plan",
            message: `${approachingExam.subject} exam in ${approachingExam.daysUntil} days and no study plan yet. Generate one now before it is too late.`,
            ctaLabel: "Build plan",
            ctaHref: `${getHubHref("plan", "planner")}&prefill=upcoming-exams`
          });
          return;
        }

        if (notes.length >= 10) {
          showHint(
            {
              id: "knowledge_graph_ready",
              message: `Your knowledge graph now has ${notes.length} concepts. See how everything you have studied connects.`,
              ctaLabel: "Open graph",
              ctaHref: getHubHref("revise", "knowledge-graph")
            },
            { onceKey: "knowledge_graph_ready" }
          );
          return;
        }

        if (profile?.createdAt && Date.now() - new Date(profile.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000 && scans.length === 0) {
          showHint(
            {
              id: "scanner_exists",
              message: "Have physical notes or textbook pages? Scan them and get an explanation of every concept on the page.",
              ctaLabel: "Open scanner",
              ctaHref: getHubHref("study", "scanner")
            },
            { onceKey: "scanner_exists" }
          );
          return;
        }

        const now = new Date();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        if (isWeekend) {
          showHint(
            {
              id: "group_room_available",
              message: "Weekend study session? Invite friends to a Group Study Room for a synchronized timer and quiz battle.",
              ctaLabel: "Open room",
              ctaHref: "/dashboard/study-room"
            },
            { onceKey: `group_room_available_${getIsoWeekendKey(now)}` }
          );
        }
      }
    }

    void evaluate();
    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  if (!hint) {
    return null;
  }

  return <ContextualHint id={hint.id} message={hint.message} ctaLabel={hint.ctaLabel} ctaHref={hint.ctaHref} />;
}
