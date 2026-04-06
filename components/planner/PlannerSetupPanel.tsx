"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { IconChecklist, IconSparkles } from "@tabler/icons-react";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { queueCelebrationsFromAchievementResponse } from "@/lib/client-celebrations";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resolvePlannerTemplateSubjects } from "@/lib/planner-templates";
import {
  ONBOARDING_BOARD_OPTIONS,
  ONBOARDING_CLASS_OPTIONS,
  ONBOARDING_STREAM_OPTIONS
} from "@/lib/study-flow";
import { normalizeTopicList, toDateInput } from "@/lib/planner-utils";
import type {
  PlannerConfirmedExamInput,
  PlannerGenerationInput,
  PlannerPrefillSource,
  StudyProfile,
  StudyStream
} from "@/types";

interface PlannerSetupPanelProps {
  loading: boolean;
  onGenerate: (payload: PlannerGenerationInput) => Promise<{
    success?: boolean;
    error?: string;
    events?: { newAchievements?: Array<{ title: string }> };
  }>;
}

interface ExamRecord {
  _id: string;
  subject: string;
  examName: string;
  examDate: string;
  board?: string | null;
  syllabus: string[];
  daysUntil: number;
  isPast: boolean;
}

interface ProfileResponse {
  profile?: {
    studyProfile?: Partial<StudyProfile>;
  };
}

interface PrefillMeta {
  source: PlannerPrefillSource;
  summary: string;
}

function joinTopics(topics: string[]) {
  return normalizeTopicList(topics).join("\n");
}

function splitTopics(text: string) {
  return normalizeTopicList(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function normalizePrefillSource(value: string): PlannerPrefillSource | "" {
  if (value === "assistant") {
    return "prefill";
  }

  if (value === "manual" || value === "autopsy" || value === "exam" || value === "upcoming-exams" || value === "prefill") {
    return value;
  }

  return "";
}

export function PlannerSetupPanel({ loading, onGenerate }: PlannerSetupPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingPrefillSource = normalizePrefillSource(searchParams.get("prefill")?.trim() ?? "");
  const appliedPrefillRef = useRef<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [savingContext, setSavingContext] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [prefillMeta, setPrefillMeta] = useState<PrefillMeta | null>(null);
  const [setupNotes, setSetupNotes] = useState<string[]>([]);
  const [focusTopicInput, setFocusTopicInput] = useState("");
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [planName, setPlanName] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [examYear, setExamYear] = useState(() => new Date().getFullYear());
  const [profileSubjects, setProfileSubjects] = useState<string[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [existingExams, setExistingExams] = useState<ExamRecord[]>([]);
  const [confirmedExams, setConfirmedExams] = useState<PlannerConfirmedExamInput[]>([]);
  const [context, setContext] = useState<{
    className: string;
    board: string;
    stream: StudyStream | "";
  }>({
    className: "",
    board: "",
    stream: ""
  });

  const requiresStream = context.className === "Class 11" || context.className === "Class 12";
  const activePrefillSource = prefillMeta?.source ?? pendingPrefillSource;
  const usesSavedExamSelection = Boolean(activePrefillSource && ["upcoming-exams", "exam", "autopsy", "manual"].includes(activePrefillSource));
  const autoTemplateSubjects = useMemo(() => {
    if (requiresStream && !context.stream) {
      return [];
    }

    return resolvePlannerTemplateSubjects({
      stream: requiresStream ? context.stream : "Other",
      profileSubjects
    });
  }, [context.stream, profileSubjects, requiresStream]);
  const hasValidExamYear = Number.isInteger(examYear) && examYear >= 2000 && examYear <= 2100;
  const canPreparePrefill = Boolean(
    context.className &&
      context.board &&
      (!requiresStream || context.stream) &&
      (usesSavedExamSelection ? selectedExamIds.length > 0 : hasValidExamYear && autoTemplateSubjects.length > 0)
  );

  const upcomingExams = useMemo(
    () =>
      existingExams
        .filter((exam) => !exam.isPast)
        .sort((left, right) => new Date(left.examDate).getTime() - new Date(right.examDate).getTime()),
    [existingExams]
  );

  const clearPrefillParamsFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("prefill");
    params.delete("subject");
    params.delete("weakTopics");
    params.delete("examId");
    params.delete("topic");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadInitialData = useCallback(async () => {
    const [profileResponse, examsResponse] = await Promise.all([
      fetch("/api/profile", { cache: "no-store" }),
      fetch("/api/exams", { cache: "no-store" })
    ]);

    const profilePayload = (await profileResponse.json().catch(() => ({}))) as ProfileResponse;
    const examsPayload = (await examsResponse.json().catch(() => ({}))) as { exams?: ExamRecord[] };

    const studyProfile = profilePayload.profile?.studyProfile;
    setContext({
      className: studyProfile?.class ?? "",
      board: studyProfile?.board ?? "",
      stream: (studyProfile?.stream as StudyStream | "") ?? ""
    });
    setProfileSubjects(normalizeTopicList(studyProfile?.subjects ?? []));
    setHoursPerDay(studyProfile?.studyHoursPerDay && studyProfile.studyHoursPerDay > 0 ? studyProfile.studyHoursPerDay : 3);
    setExistingExams(examsPayload.exams ?? []);
    setBooting(false);
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!confirmedExams.length || planName.trim()) {
      return;
    }

    setPlanName(
      confirmedExams.length === 1
        ? `${confirmedExams[0].subject} Study Plan`
        : `${confirmedExams[0].subject} + ${confirmedExams.length - 1} more exams`
    );
  }, [confirmedExams, planName]);

  useEffect(() => {
    if (booting) {
      return;
    }

    const prefill = normalizePrefillSource(searchParams.get("prefill")?.trim() ?? "");
    const subject = searchParams.get("subject")?.trim() ?? "";
    const weakTopics = searchParams.get("weakTopics")?.trim() ?? "";
    const examId = searchParams.get("examId")?.trim() ?? "";
    const topic = searchParams.get("topic")?.trim() ?? "";
    const signature = `${prefill}|${subject}|${weakTopics}|${examId}|${topic}`;

    if (!prefill) {
      appliedPrefillRef.current = null;
      return;
    }

    if (appliedPrefillRef.current === signature) {
      return;
    }

    appliedPrefillRef.current = signature;

    if (prefill === "upcoming-exams") {
      const allIds = upcomingExams.map((exam) => exam._id);
      setSelectedExamIds(allIds);
      setConfirmedExams([]);
      setSetupNotes([]);
      setPrefillMeta({
        source: "upcoming-exams",
        summary: `Prefill selected ${allIds.length} upcoming exam${allIds.length === 1 ? "" : "s"} from your saved countdowns.`
      });
    } else if (prefill === "exam" && examId) {
      const selected = existingExams.find((exam) => exam._id === examId);
      setSelectedExamIds(selected ? [selected._id] : []);
      setConfirmedExams([]);
      setSetupNotes([]);
      setPrefillMeta({
        source: "exam",
        summary: selected
          ? `Loaded the exact exam record for ${selected.subject}: ${selected.examName}.`
          : "The selected exam could not be found, so choose an exam manually."
      });
    } else if (prefill === "autopsy") {
      const matchingExams = existingExams.filter((exam) => exam.subject === subject && !exam.isPast).map((exam) => exam._id);
      setSelectedExamIds(matchingExams);
      setConfirmedExams([]);
      setSetupNotes([]);
      const topics = [topic, ...weakTopics.split(",")].filter(Boolean);
      setFocusTopics(normalizeTopicList(topics));
      setPrefillMeta({
        source: "autopsy",
        summary: matchingExams.length
          ? `Matched ${matchingExams.length} saved ${subject} exam${matchingExams.length === 1 ? "" : "s"} and imported weak topics from autopsy.`
          : `Weak topics from ${subject} autopsy were imported. Select the matching exam manually before generating the plan.`
      });
    } else if (prefill === "manual") {
      const matchingExams = existingExams.filter((exam) => !exam.isPast && (!subject || exam.subject === subject));
      setSelectedExamIds(matchingExams.map((exam) => exam._id));
      setConfirmedExams([]);
      setSetupNotes([]);
      setFocusTopics(normalizeTopicList([topic, ...weakTopics.split(",")].filter(Boolean)));
      setPrefillMeta({
        source: "manual",
        summary: matchingExams.length
          ? `Matched ${matchingExams.length} upcoming ${subject || "saved"} exam${matchingExams.length === 1 ? "" : "s"} and imported your selected focus topics.`
          : "Imported your selected focus topics. Choose the matching exams before generating the plan."
      });
    }

    clearPrefillParamsFromUrl();
  }, [booting, clearPrefillParamsFromUrl, existingExams, searchParams, upcomingExams]);

  function toggleExamSelection(examId: string) {
    setConfirmedExams([]);
    setSetupNotes([]);
    setSelectedExamIds((previous) => (previous.includes(examId) ? previous.filter((item) => item !== examId) : [...previous, examId]));
  }

  function addFocusTopic(rawTopic: string) {
    const normalized = normalizeTopicList([rawTopic])[0];
    if (!normalized) {
      return;
    }

    setFocusTopics((previous) => normalizeTopicList([...previous, normalized]));
    setFocusTopicInput("");
  }

  function removeFocusTopic(topicToRemove: string) {
    setFocusTopics((previous) => previous.filter((topic) => topic !== topicToRemove));
  }

  async function saveStudyContext() {
    setSavingContext(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studyProfile: {
          class: context.className,
          board: context.board,
          stream: context.stream,
          studyHoursPerDay: hoursPerDay
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    setSavingContext(false);

    if (!response.ok) {
      throw new Error(data.error ?? "Could not save your study context");
    }
  }

  async function prepareConfirmedExams() {
    if (!canPreparePrefill) {
      toast.error(
        usesSavedExamSelection
          ? "Select your study context and at least one exam first."
          : "Select your study context and a valid exam year first."
      );
      return;
    }

    setExtracting(true);
    try {
      await saveStudyContext();

      const response = await fetch("/api/planner/prefill/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          usesSavedExamSelection
            ? {
                className: context.className,
                board: context.board,
                stream: context.stream,
                examIds: selectedExamIds
              }
            : {
                className: context.className,
                board: context.board,
                stream: context.stream,
                examYear
              }
        )
      });
      const data = (await response.json().catch(() => ({}))) as {
        confirmedExams?: PlannerConfirmedExamInput[];
        notes?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not prepare exam details");
      }

      setConfirmedExams(data.confirmedExams ?? []);
      setSetupNotes(data.notes ?? []);
      if (!prefillMeta) {
        setPrefillMeta({
          source: "prefill",
          summary: usesSavedExamSelection
            ? "Exam details loaded. Confirm the dates and chapters, then generate the chapter plan."
            : `StudyOS built editable exam cards for ${autoTemplateSubjects.length} subject${autoTemplateSubjects.length === 1 ? "" : "s"} in the ${examYear} exam cycle.`
        });
      }
      toast.success("Exam details loaded for confirmation");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare exam details");
    } finally {
      setExtracting(false);
    }
  }

  async function createPlan() {
    if (!confirmedExams.length) {
      toast.error("Confirm at least one exam before generating the plan.");
      return;
    }

    const invalidExam = confirmedExams.find(
      (exam) => !exam.subject.trim() || !exam.examName.trim() || !exam.examDate.trim() || normalizeTopicList(exam.chapters).length === 0
    );
    if (invalidExam) {
      toast.error(`Complete the date and chapter list for ${invalidExam.subject || invalidExam.examName || "every exam"} first.`);
      return;
    }

    const payload: PlannerGenerationInput = {
      name: planName || undefined,
      hoursPerDay,
      startDate,
      focusTopics,
      prefillSource: prefillMeta?.source ?? "prefill",
      studyContext: {
        className: context.className,
        board: context.board,
        stream: context.stream,
        studyHoursPerDay: hoursPerDay,
        startDate,
        examYear
      },
      confirmedExams: confirmedExams.map((exam) => ({
        ...exam,
        chapters: normalizeTopicList(exam.chapters)
      }))
    };

    const data = await onGenerate(payload);
    if (!data?.success) {
      toast.error(data?.error ?? "Could not generate plan");
      return;
    }

    toast.success("Plan generated");
    trackEvent("study_plan_created", {
      examCount: payload.confirmedExams?.length ?? 0,
      focusTopicCount: payload.focusTopics?.length ?? 0,
      hoursPerDay: payload.hoursPerDay
    });
    queueCelebrationsFromAchievementResponse(data.events, "planner-create");
  }

  if (booting) {
    return <div className="glass-card p-5 text-sm text-[var(--muted-foreground)]">Loading plan setup...</div>;
  }

  return (
    <div className="space-y-5">
      <div id="planner-form" className="glass-card p-5 sm:p-6">
        <p className="surface-pill mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          <IconSparkles className="h-3.5 w-3.5 text-[#7B6CF6]" />
          Plan setup
        </p>
        <div className="mb-5">
          <h3 className="font-headline text-[clamp(2rem,5vw,2.8rem)] tracking-[-0.03em] text-[var(--foreground)]">
            Build a chapter plan
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Tell StudyOS your board, class, stream, and exam year. We&apos;ll build editable exam cards, ask you to confirm every date and chapter, then generate a gated chapter-by-chapter schedule.
          </p>
        </div>

        {prefillMeta ? (
          <div className="surface-card mb-4 flex flex-wrap items-start gap-3 rounded-[24px] p-4">
            <span className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-[16px] text-[#7B6CF6]">
              <IconChecklist className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                {prefillMeta.source === "autopsy"
                  ? "Autopsy source"
                  : prefillMeta.source === "exam"
                    ? "Exact exam source"
                    : prefillMeta.source === "upcoming-exams"
                      ? "Upcoming exams source"
                      : prefillMeta.source === "manual"
                        ? "Manual topic source"
                      : "Prefill flow"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">{prefillMeta.summary}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="surface-card rounded-[24px] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Step 1</p>
              <h4 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Study context</h4>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Class</label>
                  <Select value={context.className} onChange={(event) => setContext((previous) => ({ ...previous, className: event.target.value }))}>
                    <option value="">Select class</option>
                    {ONBOARDING_CLASS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Board</label>
                  <Select value={context.board} onChange={(event) => setContext((previous) => ({ ...previous, board: event.target.value }))}>
                    <option value="">Select board</option>
                    {ONBOARDING_BOARD_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                {requiresStream ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Stream</label>
                    <Select value={context.stream} onChange={(event) => setContext((previous) => ({ ...previous, stream: event.target.value as StudyStream }))}>
                      <option value="">Select stream</option>
                      {ONBOARDING_STREAM_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Hours/day</label>
                  <Input type="number" min={1} max={16} value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Plan start date</label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
              </div>
            </div>

            {usesSavedExamSelection ? (
              <div className="surface-card rounded-[24px] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Step 2</p>
                    <h4 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Choose exams</h4>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedExamIds(upcomingExams.map((exam) => exam._id));
                      setConfirmedExams([]);
                      setSetupNotes([]);
                      setPrefillMeta({
                        source: "upcoming-exams",
                        summary: `Prefill selected ${upcomingExams.length} upcoming exam${upcomingExams.length === 1 ? "" : "s"} from your saved countdowns.`
                      });
                    }}
                  >
                    Use Upcoming Exams
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {upcomingExams.length ? (
                    upcomingExams.map((exam) => (
                      <label key={exam._id} className="flex gap-3 rounded-[20px] border border-[color:var(--panel-border)] p-4 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedExamIds.includes(exam._id)}
                          onChange={() => toggleExamSelection(exam._id)}
                          className="mt-1 h-4 w-4 rounded border-white/70"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-[var(--foreground)]">
                            {exam.subject} • {exam.examName}
                          </span>
                          <span className="mt-1 block text-[var(--muted-foreground)]">
                            {toDateInput(exam.examDate)} {exam.board ? `• ${exam.board}` : ""}
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">Add upcoming exams first so the planner has something real to work from.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="surface-card rounded-[24px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Step 2</p>
                <h4 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Choose exam year</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  StudyOS will generate editable exam cards for your full subject set, then you can confirm every date and chapter before creating the plan.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Exam year</label>
                    <Input
                      type="number"
                      min={2000}
                      max={2100}
                      value={examYear}
                      onChange={(event) => setExamYear(Number(event.target.value))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Subjects to extract</label>
                    {autoTemplateSubjects.length ? (
                      <div className="flex flex-wrap gap-2">
                        {autoTemplateSubjects.map((subject) => (
                          <span key={subject} className="surface-pill rounded-full px-3 py-1.5 text-xs text-[var(--foreground)]">
                            {subject}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {requiresStream
                          ? "Choose a stream first to generate all subjects automatically."
                          : "No saved subjects were found. Add your subjects in onboarding or profile first."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="surface-card rounded-[24px] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Step 3</p>
              <h4 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Confirm syllabus and dates</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                StudyOS will try to enrich your exams, but you should confirm every date and chapter before we build the final plan.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void prepareConfirmedExams()} disabled={!canPreparePrefill || extracting || savingContext}>
                  {extracting || savingContext ? "Loading details..." : "Fetch and confirm"}
                </Button>
                {usesSavedExamSelection ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const selected = upcomingExams.filter((exam) => selectedExamIds.includes(exam._id));
                      setConfirmedExams(
                        selected.map((exam) => ({
                          examId: exam._id,
                          subject: exam.subject,
                          examName: exam.examName,
                          examDate: toDateInput(exam.examDate),
                          board: exam.board ?? context.board,
                          chapters: normalizeTopicList(exam.syllabus ?? []),
                          source: exam.syllabus?.length ? "saved" : "manual"
                        }))
                      );
                      setSetupNotes(["Manual mode active. Add or edit chapters before generating the plan."]);
                      setPrefillMeta({
                        source: "manual",
                        summary: "Manual confirmation mode is active. Review every exam date and chapter list before generating the plan."
                      });
                    }}
                    disabled={!selectedExamIds.length}
                  >
                    Manual fallback
                  </Button>
                ) : null}
              </div>
            </div>

            {setupNotes.length ? (
              <div className="surface-card rounded-[24px] p-4">
                {setupNotes.map((note) => (
                  <p key={note} className="text-sm leading-6 text-[var(--muted-foreground)]">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {confirmedExams.length ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Plan name</label>
                <Input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Class 12 Board Recovery Plan" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Focus topics</label>
                <div className="flex gap-2">
                  <Input
                    value={focusTopicInput}
                    onChange={(event) => setFocusTopicInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addFocusTopic(focusTopicInput);
                      }
                    }}
                    placeholder="Weak topic or chapter"
                  />
                  <Button type="button" variant="outline" onClick={() => addFocusTopic(focusTopicInput)}>
                    Add
                  </Button>
                </div>
                {focusTopics.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {focusTopics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        className="surface-pill rounded-full px-3 py-1.5 text-xs text-[var(--foreground)]"
                        onClick={() => removeFocusTopic(topic)}
                      >
                        {topic} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {confirmedExams.map((exam, index) => (
                <div key={`${exam.subject}-${exam.examName}-${index}`} className="surface-card rounded-[24px] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{exam.source}</p>
                    {exam.officialExamDate ? (
                      <span className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                        official date {exam.officialExamDate}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Input
                      value={exam.subject}
                      onChange={(event) =>
                        setConfirmedExams((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, subject: event.target.value } : item))
                        )
                      }
                      placeholder="Subject"
                    />
                    <Input
                      value={exam.examName}
                      onChange={(event) =>
                        setConfirmedExams((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, examName: event.target.value } : item))
                        )
                      }
                      placeholder="Exam name"
                    />
                    <Input
                      type="date"
                      value={exam.examDate}
                      onChange={(event) =>
                        setConfirmedExams((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, examDate: event.target.value } : item))
                        )
                      }
                    />
                    <Input
                      value={exam.board ?? ""}
                      onChange={(event) =>
                        setConfirmedExams((previous) =>
                          previous.map((item, itemIndex) => (itemIndex === index ? { ...item, board: event.target.value } : item))
                        )
                      }
                      placeholder="Board"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Chapters or topics</label>
                    <Textarea
                      value={joinTopics(exam.chapters)}
                      onChange={(event) =>
                        setConfirmedExams((previous) =>
                          previous.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, chapters: splitTopics(event.target.value) } : item
                          )
                        )
                      }
                      className="min-h-[180px]"
                      placeholder="One chapter per line"
                    />
                    {exam.notes ? <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{exam.notes}</p> : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void createPlan()} disabled={loading}>
                {loading ? "Generating..." : "Generate chapter plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmedExams([])}>
                Start over
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
