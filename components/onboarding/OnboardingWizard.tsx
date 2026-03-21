"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconAlertTriangle, IconArrowRight, IconCheck, IconChevronRight, IconClockHour4, IconLoader2, IconSparkles, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import {
  ONBOARDING_BOARD_OPTIONS,
  ONBOARDING_CLASS_OPTIONS,
  ONBOARDING_GOAL_OPTIONS,
  ONBOARDING_STREAM_OPTIONS,
  ONBOARDING_STYLE_OPTIONS,
  STUDY_STYLE_RECOMMENDATIONS,
  WORKFLOW_TOOL_GROUPS
} from "@/lib/study-flow";
import { queueForcedTour } from "@/lib/tour";
import type { OnboardingStepPayload, StudyProfile } from "@/types";

interface ExistingExam {
  _id?: string;
  subject: string;
  examName: string;
  examDate: string;
  board?: string;
}

interface Props {
  name: string;
  initialStep: number;
  initialProfile: Partial<StudyProfile>;
  existingExams: ExistingExam[];
}

interface ExamDraft {
  subject: string;
  examName: string;
  examDate: string;
}

const INTRO_CARDS = [
  "Notes written like a topper",
  "Quizzes that target your weak spots",
  "A study plan built around your exams",
  "Revision scheduled so you never forget"
] as const;

const SUBJECT_OPTIONS = [
  { name: "Mathematics", emoji: "" },
  { name: "Physics", emoji: "" },
  { name: "Chemistry", emoji: "" },
  { name: "Biology", emoji: "" },
  { name: "History", emoji: "" },
  { name: "Geography", emoji: "" },
  { name: "English", emoji: "" },
  { name: "Computer Science", emoji: "" },
  { name: "Economics", emoji: "" },
  { name: "Political Science", emoji: "" },
  { name: "Accountancy", emoji: "" },
  { name: "Business Studies", emoji: "" },
  { name: "Psychology", emoji: "" },
  { name: "Sociology", emoji: "" },
  { name: "Other", emoji: "" }
] as const;

const STEPS = [
  "Welcome",
  "Study Profile",
  "Subjects",
  "Exams",
  "Study Style",
  "Auto Setup",
  "Feature Tour"
] as const;

const AUTO_SETUP_STEPS = [
  { key: "exams", label: "Creating your exam countdowns..." },
  { key: "planner", label: "Building your first study plan..." },
  { key: "revision", label: "Setting up your revision schedule..." },
  { key: "formula", label: "Preparing your formula sheets..." },
  { key: "complete", label: "Personalizing your dashboard..." },
  { key: "done", label: "Everything is ready!" }
] as const;

type AutoSetupKey = (typeof AUTO_SETUP_STEPS)[number]["key"];
type AutoSetupStatus = Record<AutoSetupKey, "idle" | "running" | "success" | "warning">;
type SaveIssue = {
  step: number;
  message: string;
  recoveryHint?: string;
};

type RequestError = Error & {
  status?: number;
};

const STEP_TITLE_CLASS = "mt-3 font-headline text-[clamp(2rem,5vw,3.3rem)] tracking-[-0.04em] text-[var(--foreground)]";

function getRoundedHoursLabel(value: number) {
  return `${value.toFixed(1).replace(".0", "")} hours/day`;
}

async function postJson<T>(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  const raw = await response.text();
  let data: (T & { error?: string }) | { error?: string } = {};

  try {
    data = raw ? ((JSON.parse(raw) as T & { error?: string }) ?? {}) : {};
  } catch {
    data = raw ? { error: raw } : {};
  }

  if (!response.ok) {
    const message =
      response.status === 404 && url === "/api/onboarding/save-step"
        ? "The onboarding save route was unavailable. Restart the dev server with `npm run dev:clean` and try again."
        : data.error ?? "Something went wrong.";
    const error = new Error(message) as RequestError;
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export function OnboardingWizard({ name, initialStep, initialProfile, existingExams }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(Math.max(0, Math.min(6, initialStep)));
  const [introIndex, setIntroIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [setupFinished, setSetupFinished] = useState(false);
  const [saveIssue, setSaveIssue] = useState<SaveIssue | null>(null);
  const [setupStatus, setSetupStatus] = useState<AutoSetupStatus>({
    exams: "idle",
    planner: "idle",
    revision: "idle",
    formula: "idle",
    complete: "idle",
    done: "idle"
  });
  const setupStartedRef = useRef(false);
  const [profile, setProfile] = useState<StudyProfile>({
    class: initialProfile.class ?? "",
    board: initialProfile.board ?? "",
    stream: initialProfile.stream ?? "",
    subjects: initialProfile.subjects ?? [],
    examGoal: initialProfile.examGoal ?? "",
    studyHoursPerDay: initialProfile.studyHoursPerDay ?? 3,
    weakAreas: initialProfile.weakAreas ?? [],
    studyStyle: initialProfile.studyStyle ?? "mixed"
  });
  const requiresStream = profile.class === "Class 11" || profile.class === "Class 12";
  const [examDraft, setExamDraft] = useState<ExamDraft>({
    subject: initialProfile.subjects?.[0] ?? "Mathematics",
    examName: "",
    examDate: ""
  });
  const [exams, setExams] = useState<ExamDraft[]>(
    existingExams.map((exam) => ({
      subject: exam.subject,
      examName: exam.examName,
      examDate: exam.examDate.slice(0, 10)
    }))
  );

  const readinessPercent = Math.round(((currentStep + (setupFinished ? 1 : 0)) / STEPS.length) * 100);
  const canContinueStep1 = Boolean(
    profile.class &&
      profile.board &&
      profile.examGoal &&
      profile.studyHoursPerDay > 0 &&
      (!requiresStream || profile.stream)
  );
  const canContinueStep2 = profile.subjects.length > 0 && profile.weakAreas.length > 0;
  const canContinueStep3 = exams.length > 0;
  const currentStepLabel = STEPS[currentStep] ?? STEPS[0];
  const existingExamKeys = useMemo(
    () =>
      new Set(
        existingExams.map((exam) =>
          [exam.subject.trim().toLowerCase(), exam.examName.trim().toLowerCase(), exam.examDate.slice(0, 10)].join("::")
        )
      ),
    [existingExams]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIntroIndex((previous) => (previous + 1) % INTRO_CARDS.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, []);

  const firstName = useMemo(() => name.trim().split(/\s+/)[0] || "Student", [name]);

  async function saveStep(step: number, data: OnboardingStepPayload) {
    await postJson<{ success: boolean }>("/api/onboarding/save-step", { step, data });
  }

  function setAutoSetup(key: AutoSetupKey, value: AutoSetupStatus[AutoSetupKey]) {
    setSetupStatus((previous) => ({ ...previous, [key]: value }));
  }

  function clearSaveIssue(step?: number) {
    setSaveIssue((previous) => {
      if (!previous) {
        return null;
      }
      if (typeof step === "number" && previous.step !== step) {
        return previous;
      }
      return null;
    });
  }

  function reportSaveIssue(step: number, error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    const status =
      error && typeof error === "object" && "status" in error ? Number((error as { status?: number }).status ?? 0) : 0;

    setSaveIssue({
      step,
      message,
      recoveryHint:
        status === 404
          ? "The route exists in the repo, but your local server may be stale. Restart with `npm run dev:clean` if this keeps happening."
          : undefined
    });
    toast.error(message);
  }

  async function continueFromStep1() {
    setLoading(true);
    clearSaveIssue(1);
    try {
      await saveStep(1, {
        class: profile.class,
        board: profile.board,
        stream: profile.stream,
        examGoal: profile.examGoal,
        studyHoursPerDay: profile.studyHoursPerDay
      });
      setCurrentStep(2);
    } catch (error) {
      reportSaveIssue(1, error, "Could not save your profile.");
    } finally {
      setLoading(false);
    }
  }

  async function continueFromStep2() {
    setLoading(true);
    clearSaveIssue(2);
    try {
      await saveStep(2, { subjects: profile.subjects, weakAreas: profile.weakAreas });
      setCurrentStep(3);
    } catch (error) {
      reportSaveIssue(2, error, "Could not save your subjects.");
    } finally {
      setLoading(false);
    }
  }

  async function continueFromStep3() {
    setLoading(true);
    clearSaveIssue(3);
    try {
      const unsavedExams = exams.filter((exam) => {
        const key = [exam.subject.trim().toLowerCase(), exam.examName.trim().toLowerCase(), exam.examDate].join("::");
        return !existingExamKeys.has(key);
      });
      await Promise.all(unsavedExams.map((exam) => postJson("/api/exams", exam)));
      await saveStep(3, {});
      setCurrentStep(4);
    } catch (error) {
      reportSaveIssue(3, error, "Could not save your exams.");
    } finally {
      setLoading(false);
    }
  }

  async function continueFromStep4() {
    setLoading(true);
    clearSaveIssue(4);
    try {
      await saveStep(4, { studyStyle: profile.studyStyle });
      setCurrentStep(5);
    } catch (error) {
      reportSaveIssue(4, error, "Could not save your study style.");
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding({ skipped = false }: { skipped?: boolean } = {}) {
    const data = await postJson<{ redirectTo: string }>("/api/onboarding/complete");
    if (skipped) {
      toast.success("Setup skipped. You can always restart the tour from the Help menu.");
    }
    queueForcedTour("dashboard", "full");
    router.push(data.redirectTo);
    router.refresh();
  }

  async function skipSetup() {
    setLoading(true);
    try {
      await completeOnboarding({ skipped: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not skip setup.");
      setLoading(false);
    }
  }

  const runAutoSetup = useCallback(async () => {
    const examBySubject = new Map<string, string>();
    exams.forEach((exam) => {
      if (!examBySubject.has(exam.subject)) {
        examBySubject.set(exam.subject, exam.examDate);
      }
    });

    setAutoSetup("exams", "running");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setAutoSetup("exams", "success");

    async function runSetupStep(key: AutoSetupKey, work: () => Promise<unknown>) {
      setAutoSetup(key, "running");
      try {
        await work();
        setAutoSetup(key, "success");
      } catch {
        setAutoSetup(key, "warning");
      }
    }

    await Promise.all([
      runSetupStep("planner", () =>
        postJson("/api/planner", {
          name: "My First Study Plan",
          startDate: new Date().toISOString().slice(0, 10),
          hoursPerDay: Math.max(1, profile.studyHoursPerDay),
          subjects: profile.subjects.map((subject, index) => ({
            name: subject,
            examDate: examBySubject.get(subject) ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            importance: profile.weakAreas.includes(subject) ? 5 : Math.max(2, 4 - index)
          }))
        })
      ),
      runSetupStep("revision", () =>
        Promise.all(
          profile.subjects.map((subject) =>
            postJson("/api/revision/schedule", {
              topic: subject,
              subject,
              type: "manual",
              sourceTitle: `${subject} baseline revision`
            })
          )
        )
      ),
      runSetupStep("formula", () => postJson("/api/formula-sheet/init", { subjects: profile.subjects }))
    ]);

    setAutoSetup("complete", "running");
    try {
      await postJson("/api/onboarding/complete");
      setAutoSetup("complete", "success");
    } catch {
      setAutoSetup("complete", "warning");
    }

    setAutoSetup("done", "success");
    setSetupFinished(true);
  }, [exams, profile.studyHoursPerDay, profile.subjects, profile.weakAreas]);

  useEffect(() => {
    if (currentStep !== 5 || setupStartedRef.current) {
      return;
    }
    setupStartedRef.current = true;
    void runAutoSetup();
  }, [currentStep, runAutoSetup]);

  function toggleSubject(subject: string) {
    setProfile((previous) => {
      const exists = previous.subjects.includes(subject);
      const subjects = exists ? previous.subjects.filter((item) => item !== subject) : [...previous.subjects, subject];
      const weakAreas = previous.weakAreas.filter((item) => subjects.includes(item));
      return {
        ...previous,
        subjects,
        weakAreas: weakAreas.length ? weakAreas : subjects.slice(0, 1)
      };
    });
    setExamDraft((previous) => ({ ...previous, subject }));
  }

  function addExam() {
    if (!examDraft.subject || !examDraft.examName.trim() || !examDraft.examDate) {
      toast.error("Add a subject, exam name, and date first.");
      return;
    }

    setExams((previous) => [...previous, { ...examDraft, examName: examDraft.examName.trim() }]);
    setExamDraft((previous) => ({ ...previous, examName: "", examDate: "" }));
  }

  function renderSkip() {
    if (currentStep === 0 || currentStep === 5) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => void skipSetup()}
        disabled={loading}
        className="text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
      >
        Skip setup →
      </button>
    );
  }

  function renderSaveIssue(step: number, retry: () => void) {
    if (!saveIssue || saveIssue.step !== step) {
      return null;
    }

    return (
      <div className="rounded-[22px] border border-[#FCA5A5]/35 bg-[#FCA5A5]/12 p-4 text-sm">
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FCA5A5]/20 text-[#B91C1C]">
            <IconAlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[#7F1D1D]">{saveIssue.message}</p>
            {saveIssue.recoveryHint ? <p className="mt-1 leading-6 text-[#991B1B]">{saveIssue.recoveryHint}</p> : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,var(--background-strong)_0%,var(--background)_100%)] px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col gap-4 xl:grid xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="glass-card rounded-[24px] p-4 xl:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">First-time setup</p>
              <p className="mt-2 font-headline text-[2rem] tracking-[-0.04em] text-[var(--foreground)]">{currentStepLabel}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Step {Math.min(currentStep + 1, STEPS.length)} of {STEPS.length}
              </p>
            </div>
            <div className="min-w-[170px] flex-1 sm:max-w-[240px]">
              <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
                <span>Workspace readiness</span>
                <span>{readinessPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--surface-low)]">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#7B6CF6,#6EE7B7)]" style={{ width: `${readinessPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <aside className="glass-card hidden flex-col rounded-[28px] p-5 xl:flex xl:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#7B6CF6] text-white shadow-[var(--primary-shadow)]">
              <IconSparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-3xl text-[var(--foreground)]">StudyOS</p>
              <p className="text-sm text-[var(--muted-foreground)]">First-time setup</p>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            {STEPS.map((step, index) => {
              const complete = index < currentStep || (currentStep === 5 && setupFinished && index <= 5);
              const active = index === currentStep;
              return (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-3 rounded-[18px] px-3 py-3 transition",
                    active && "bg-[color:var(--surface-high)]",
                    complete && "bg-[#7B6CF6]/10"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                      complete
                        ? "border-transparent bg-[#7B6CF6] text-white"
                        : active
                          ? "border-transparent bg-[#7B6CF6] text-white"
                          : "border-[color:var(--panel-border)] text-[var(--muted-foreground)]"
                    )}
                  >
                    {complete ? <IconCheck className="h-4 w-4" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>{step}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-8">
            <p className="text-sm text-[var(--muted-foreground)]">Your study environment is {readinessPercent}% ready</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--surface-low)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#7B6CF6,#6EE7B7)]" style={{ width: `${readinessPercent}%` }} />
            </div>
          </div>
        </aside>

        <section className="glass-card rounded-[28px] p-4 sm:p-6 lg:p-8">
          {currentStep === 0 ? (
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Welcome</p>
                  <h1 className="mt-3 font-headline text-[clamp(2.8rem,6vw,4.9rem)] leading-[0.94] tracking-[-0.05em] text-[var(--foreground)]">
                    Welcome, {firstName}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                    Let&apos;s set up your personal study environment in 5 minutes. We&apos;ll use your answers to personalise everything — your notes, your quizzes, your study plan, and your revision schedule.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {INTRO_CARDS.map((card, index) => (
                    <div
                      key={card}
                      className={cn(
                        "surface-card rounded-[24px] p-5 transition-all duration-500",
                        introIndex === index ? "translate-y-0 border-[#7B6CF6]/35 bg-[#7B6CF6]/10" : "opacity-70"
                      )}
                    >
                      <p className="font-medium text-[var(--foreground)]">{card}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="gap-2 rounded-full px-6" onClick={() => setCurrentStep(1)}>
                  Let&apos;s Get Started <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Step 2</p>
                <h2 className={STEP_TITLE_CLASS}>Tell us about yourself</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                  This helps us generate better notes and quizzes for your level.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-medium text-[var(--foreground)]">What class are you in?</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {ONBOARDING_CLASS_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setProfile((previous) => ({ ...previous, class: item }))}
                        className={cn(
                          "rounded-full border px-4 py-3 text-sm transition",
                          profile.class === item ? "border-transparent bg-[#7B6CF6] text-white shadow-[var(--primary-shadow)]" : "surface-pill text-[var(--muted-foreground)]"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-[var(--foreground)]">Which board?</p>
                  <div className="flex flex-wrap gap-2">
                    {ONBOARDING_BOARD_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setProfile((previous) => ({ ...previous, board: item }))}
                        className={cn(
                          "rounded-full border px-4 py-3 text-sm transition",
                          profile.board === item ? "border-transparent bg-[#7B6CF6] text-white shadow-[var(--primary-shadow)]" : "surface-pill text-[var(--muted-foreground)]"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {requiresStream ? (
                  <div>
                    <p className="mb-3 text-sm font-medium text-[var(--foreground)]">Which stream are you in?</p>
                    <div className="flex flex-wrap gap-2">
                      {ONBOARDING_STREAM_OPTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setProfile((previous) => ({ ...previous, stream: item }))}
                          className={cn(
                            "rounded-full border px-4 py-3 text-sm transition",
                            profile.stream === item
                              ? "border-transparent bg-[#7B6CF6] text-white shadow-[var(--primary-shadow)]"
                              : "surface-pill text-[var(--muted-foreground)]"
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="mb-3 text-sm font-medium text-[var(--foreground)]">What&apos;s your main goal?</p>
                  <div className="flex flex-wrap gap-2">
                    {ONBOARDING_GOAL_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setProfile((previous) => ({ ...previous, examGoal: item }))}
                        className={cn(
                          "rounded-full border px-4 py-3 text-sm transition",
                          profile.examGoal === item ? "border-transparent bg-[#7B6CF6] text-white shadow-[var(--primary-shadow)]" : "surface-pill text-[var(--muted-foreground)]"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">How many hours can you study per day?</p>
                    <span className="rounded-full bg-[#7B6CF6]/10 px-3 py-1 text-sm font-medium text-[#7B6CF6]">
                      {getRoundedHoursLabel(profile.studyHoursPerDay)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={profile.studyHoursPerDay}
                    onChange={(event) =>
                      setProfile((previous) => ({ ...previous, studyHoursPerDay: Number(event.target.value) }))
                    }
                    className="mt-4 h-2 w-full accent-[#7B6CF6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                {renderSkip()}
                <Button disabled={!canContinueStep1 || loading} className="gap-2 rounded-full" onClick={() => void continueFromStep1()}>
                  {loading ? "Saving..." : "Continue"} <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {renderSaveIssue(1, () => void continueFromStep1())}
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Step 3</p>
                <h2 className={STEP_TITLE_CLASS}>Which subjects are you studying?</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                  Select all that apply. We&apos;ll set up dedicated spaces for each.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
                {SUBJECT_OPTIONS.map((item) => {
                  const selected = profile.subjects.includes(item.name);
                  const accent = SUBJECT_COLOR_VALUES[item.name] ?? "#7B6CF6";
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => toggleSubject(item.name)}
                      className={cn(
                        "relative rounded-[24px] border px-4 py-5 text-left transition",
                        selected ? "shadow-[0_18px_35px_rgba(123,108,246,0.14)]" : "surface-card"
                      )}
                      style={selected ? { borderColor: `${accent}70`, backgroundColor: `${accent}12` } : undefined}
                    >
                      <span className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-full text-[#7B6CF6]">
                        <IconSparkles className="h-4 w-4" />
                      </span>
                      <p className="mt-4 font-medium text-[var(--foreground)]">{item.name}</p>
                      {selected ? (
                        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#7B6CF6] text-white">
                          <IconCheck className="h-4 w-4" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Which of these is your weakest subject?</p>
                <Select
                  value={profile.weakAreas[0] ?? ""}
                  onChange={(event) => setProfile((previous) => ({ ...previous, weakAreas: [event.target.value] }))}
                >
                  <option value="">Select your weakest subject</option>
                  {profile.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3">
                {renderSkip()}
                <Button disabled={!canContinueStep2 || loading} className="gap-2 rounded-full" onClick={() => void continueFromStep2()}>
                  {loading ? "Saving..." : "Continue"} <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {renderSaveIssue(2, () => void continueFromStep2())}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Step 4</p>
                <h2 className={STEP_TITLE_CLASS}>When are your exams?</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                  Add your upcoming exams so we can build your study plan and countdown timers. You can add more later.
                </p>
              </div>

              <div className="surface-card rounded-[26px] p-5">
                <p className="mb-4 text-sm text-[var(--muted-foreground)]">
                  We noticed you selected {profile.subjects.join(", ")}. Most students add their board exam / final exam first.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Select
                    value={examDraft.subject}
                    onChange={(event) => setExamDraft((previous) => ({ ...previous, subject: event.target.value }))}
                  >
                    {profile.subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={examDraft.examName}
                    onChange={(event) => setExamDraft((previous) => ({ ...previous, examName: event.target.value }))}
                    placeholder="Board Exam"
                    className="md:col-span-2"
                  />
                  <Input
                    type="date"
                    value={examDraft.examDate}
                    onChange={(event) => setExamDraft((previous) => ({ ...previous, examDate: event.target.value }))}
                  />
                </div>
                <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={addExam}>
                  Add Exam
                </Button>
              </div>

              <div className="space-y-3">
                {exams.map((exam, index) => {
                  const color = SUBJECT_COLOR_VALUES[exam.subject] ?? "#7B6CF6";
                  return (
                    <div key={`${exam.subject}-${exam.examName}-${index}`} className="surface-card flex items-center justify-between gap-3 rounded-[22px] p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${color}16`, color }}>
                            {exam.subject}
                          </span>
                          <p className="font-medium text-[var(--foreground)]">{exam.examName}</p>
                        </div>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{exam.examDate}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExams((previous) => previous.filter((_, examIndex) => examIndex !== index))}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--panel-border)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                        aria-label="Delete exam"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                {renderSkip()}
                <Button disabled={!canContinueStep3 || loading} className="gap-2 rounded-full" onClick={() => void continueFromStep3()}>
                  {loading ? "Saving..." : "Continue"} <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {renderSaveIssue(3, () => void continueFromStep3())}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Step 5</p>
                <h2 className={STEP_TITLE_CLASS}>How do you study best?</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                  This helps us recommend the right tools in the right order.
                </p>
              </div>

              <div className="space-y-3">
                {ONBOARDING_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setProfile((previous) => ({ ...previous, studyStyle: option.value }))}
                    className={cn(
                      "w-full rounded-[26px] border p-5 text-left transition",
                      profile.studyStyle === option.value ? "border-[#7B6CF6] bg-[#7B6CF6]/8 shadow-[var(--panel-shadow-hover)]" : "surface-card"
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{option.title}</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{option.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:max-w-[40%] md:justify-end">
                        {option.tools.map((tool) => (
                          <span key={tool} className="rounded-full bg-[color:var(--surface-low)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                {renderSkip()}
                <Button disabled={loading} className="gap-2 rounded-full" onClick={() => void continueFromStep4()}>
                  {loading ? "Saving..." : "Continue"} <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
              {renderSaveIssue(4, () => void continueFromStep4())}
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Step 6</p>
                <h2 className={STEP_TITLE_CLASS}>Setting up your study environment...</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                  Sit tight — we&apos;re building everything for you automatically.
                </p>
              </div>

              <div className="space-y-3">
                {AUTO_SETUP_STEPS.map((step) => {
                  const status = setupStatus[step.key];
                  return (
                    <div key={step.key} className="surface-card flex items-start gap-3 rounded-[22px] p-4">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          status === "success" && "bg-[#22C55E]/15 text-[#15803D]",
                          status === "warning" && "bg-[#F59E0B]/15 text-[#B45309]",
                          status === "running" && "bg-[#7B6CF6]/15 text-[#7B6CF6]",
                          status === "idle" && "bg-[color:var(--surface-low)] text-[var(--muted-foreground)]"
                        )}
                      >
                        {status === "success" ? (
                          <IconCheck className="h-4 w-4" />
                        ) : status === "warning" ? (
                          <IconAlertTriangle className="h-4 w-4" />
                        ) : status === "running" ? (
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <IconClockHour4 className="h-4 w-4" />
                        )}
                      </span>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{step.label}</p>
                        {status === "warning" ? (
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">(You can set this up later in the dashboard)</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {setupFinished ? (
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#22C55E]/14 text-[#16A34A] shadow-[0_20px_40px_rgba(34,197,94,0.18)]">
                    <IconCheck className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="font-headline text-4xl text-[var(--foreground)]">Your study environment is ready!</h3>
                    <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                      Exams, revision, formulas, and your first dashboard setup are all in place.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button className="gap-2 rounded-full" onClick={() => setCurrentStep(6)}>
                      Continue to Tour <IconArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tertiary-foreground)]">Step 7</p>
                <h2 className={STEP_TITLE_CLASS}>Here&apos;s your study workflow</h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
                  StudyOS works as a connected system. Each tool feeds the next. Here&apos;s how to use it in the right order:
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {WORKFLOW_TOOL_GROUPS.map((group, index) => (
                  <div key={group.phase} className="relative rounded-[24px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">{group.title}</p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{group.subtitle}</h3>
                    <div className="mt-4 space-y-2">
                      {group.tools.map((tool) => (
                        <div key={tool} className="rounded-full bg-[color:var(--surface-high)] px-3 py-2 text-sm text-[var(--foreground)]">
                          {tool}
                        </div>
                      ))}
                    </div>
                    {index < WORKFLOW_TOOL_GROUPS.length - 1 ? (
                      <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-[#7B6CF6] p-2 text-white lg:flex">
                        <IconChevronRight className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="surface-card rounded-[24px] p-5">
                <p className="text-sm text-[var(--foreground)]">Study Room lets you do all of this with friends.</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  Recommended starting workflow: {STUDY_STYLE_RECOMMENDATIONS[profile.studyStyle ?? "mixed"]}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                {renderSkip()}
                <Button className="gap-2 rounded-full" onClick={() => void completeOnboarding()}>
                  Start My First Study Session <IconArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
