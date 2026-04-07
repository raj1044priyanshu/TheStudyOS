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
import { resolvePlannerTemplateSubjects } from "@/lib/planner-templates";
import {
  ONBOARDING_BOARD_OPTIONS,
  ONBOARDING_CLASS_OPTIONS,
  ONBOARDING_STREAM_OPTIONS
} from "@/lib/study-flow";
import { normalizeTopicList, toDateInput } from "@/lib/planner-utils";
import type {
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

interface ManualPlanSubject {
  id: string;
  subject: string;
  examDate: string;
  importance: number;
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

function createManualPlanSubject(subject = "", examDate = "", importance = 3): ManualPlanSubject {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subject,
    examDate,
    importance
  };
}

function buildManualPlanSubjectsFromExams(exams: ExamRecord[]) {
  const deduped = new Map<string, { subject: string; examDate: string }>();
  const ordered = [...exams].sort((left, right) => new Date(left.examDate).getTime() - new Date(right.examDate).getTime());

  for (const exam of ordered) {
    const key = exam.subject.trim().toLowerCase();
    if (!key || deduped.has(key)) {
      continue;
    }

    deduped.set(key, {
      subject: exam.subject,
      examDate: toDateInput(exam.examDate)
    });
  }

  return Array.from(deduped.values()).map((item, index) =>
    createManualPlanSubject(item.subject, item.examDate, Math.max(1, 5 - index))
  );
}

function buildManualPlanSubjectsFromTemplates(subjects: string[], exams: ExamRecord[]) {
  const examBySubject = new Map<string, string>();

  exams
    .filter((exam) => !exam.isPast)
    .sort((left, right) => new Date(left.examDate).getTime() - new Date(right.examDate).getTime())
    .forEach((exam) => {
      const key = exam.subject.trim().toLowerCase();
      if (!key || examBySubject.has(key)) {
        return;
      }

      examBySubject.set(key, toDateInput(exam.examDate));
    });

  return subjects.map((subject, index) =>
    createManualPlanSubject(subject, examBySubject.get(subject.trim().toLowerCase()) ?? "", Math.max(1, 5 - index))
  );
}

export function PlannerSetupPanel({ loading, onGenerate }: PlannerSetupPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingPrefillSource = normalizePrefillSource(searchParams.get("prefill")?.trim() ?? "");
  const appliedPrefillRef = useRef<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [savingContext, setSavingContext] = useState(false);
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
  const [manualSubjects, setManualSubjects] = useState<ManualPlanSubject[]>([]);
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
  const canLoadManualSubjects = Boolean(
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
    if (!manualSubjects.length || planName.trim()) {
      return;
    }

    setPlanName(
      manualSubjects.length === 1
        ? `${manualSubjects[0].subject} Study Plan`
        : `${manualSubjects[0].subject} + ${manualSubjects.length - 1} more subjects`
    );
  }, [manualSubjects, planName]);

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
      const selectedExams = upcomingExams;
      const allIds = selectedExams.map((exam) => exam._id);
      setSelectedExamIds(allIds);
      setManualSubjects(buildManualPlanSubjectsFromExams(selectedExams));
      setSetupNotes(["Selected exams were loaded into the manual builder. Edit the dates or priorities if you want."]);
      setPrefillMeta({
        source: "upcoming-exams",
        summary: `Prefill selected ${allIds.length} upcoming exam${allIds.length === 1 ? "" : "s"} from your saved countdowns.`
      });
    } else if (prefill === "exam" && examId) {
      const selected = existingExams.find((exam) => exam._id === examId);
      setSelectedExamIds(selected ? [selected._id] : []);
      setManualSubjects(selected ? buildManualPlanSubjectsFromExams([selected]) : []);
      setSetupNotes(selected ? ["The selected exam was loaded into the manual builder."] : []);
      setPrefillMeta({
        source: "exam",
        summary: selected
          ? `Loaded the exact exam record for ${selected.subject}: ${selected.examName}.`
          : "The selected exam could not be found, so choose an exam manually."
      });
    } else if (prefill === "autopsy") {
      const matchingExams = existingExams.filter((exam) => exam.subject === subject && !exam.isPast);
      setSelectedExamIds(matchingExams.map((exam) => exam._id));
      setManualSubjects(buildManualPlanSubjectsFromExams(matchingExams));
      setSetupNotes(
        matchingExams.length
          ? ["Matched exams were loaded into the manual builder. Adjust the dates or priorities as needed."]
          : []
      );
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
      setManualSubjects(buildManualPlanSubjectsFromExams(matchingExams));
      setSetupNotes(
        matchingExams.length
          ? ["Matched exams were loaded into the manual builder with your focus topics."]
          : ["Your focus topics were imported. Add subjects and dates manually to generate the plan."]
      );
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

  function loadSelectedExamsIntoManualBuilder() {
    const selected = upcomingExams.filter((exam) => selectedExamIds.includes(exam._id));
    if (!selected.length) {
      toast.error("Select at least one exam first.");
      return;
    }

    const nextSubjects = buildManualPlanSubjectsFromExams(selected);
    setManualSubjects(nextSubjects);
    setSetupNotes(["Selected exams were loaded into the manual builder. You can still edit every date and priority."]);
    if (!prefillMeta) {
      setPrefillMeta({
        source: "manual",
        summary: `Loaded ${nextSubjects.length} subject${nextSubjects.length === 1 ? "" : "s"} from your saved exams.`
      });
    }
    toast.success("Selected exams loaded");
  }

  function loadSuggestedSubjectsIntoManualBuilder() {
    if (!autoTemplateSubjects.length) {
      toast.error("No subjects were available to load.");
      return;
    }

    const nextSubjects = buildManualPlanSubjectsFromTemplates(autoTemplateSubjects, existingExams);
    setManualSubjects(nextSubjects);
    setSetupNotes(["Suggested subjects were added. Fill in or adjust the exam dates and priorities manually before generating the plan."]);
    if (!prefillMeta) {
      setPrefillMeta({
        source: "manual",
        summary: `Loaded ${nextSubjects.length} suggested subject${nextSubjects.length === 1 ? "" : "s"} for manual planning.`
      });
    }
    toast.success("Suggested subjects loaded");
  }

  function addManualSubject() {
    setManualSubjects((previous) => [...previous, createManualPlanSubject("", "", 3)]);
  }

  function updateManualSubject(id: string, updates: Partial<Omit<ManualPlanSubject, "id">>) {
    setManualSubjects((previous) => previous.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function removeManualSubject(id: string) {
    setManualSubjects((previous) => previous.filter((item) => item.id !== id));
  }

  async function createPlan() {
    if (!manualSubjects.length) {
      toast.error("Add at least one subject before generating the plan.");
      return;
    }

    const normalizedSubjects = manualSubjects.map((item) => ({
      name: item.subject.trim(),
      examDate: item.examDate.trim(),
      importance: Math.max(1, Math.min(5, Math.round(item.importance)))
    }));

    const invalidSubject = normalizedSubjects.find(
      (item) => !item.name || !item.examDate || !Number.isFinite(item.importance) || item.importance < 1 || item.importance > 5
    );
    if (invalidSubject) {
      toast.error(`Complete the subject, exam date, and priority for ${invalidSubject.name || "every row"} first.`);
      return;
    }

    try {
      await saveStudyContext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your study context");
      return;
    }

    const payload: PlannerGenerationInput = {
      name: planName || undefined,
      hoursPerDay,
      startDate,
      focusTopics,
      prefillSource: prefillMeta?.source ?? "manual",
      studyContext: {
        className: context.className,
        board: context.board,
        stream: context.stream,
        studyHoursPerDay: hoursPerDay,
        startDate,
        examYear
      },
      subjects: normalizedSubjects
    };

    const data = await onGenerate(payload);
    if (!data?.success) {
      toast.error(data?.error ?? "Could not generate plan");
      return;
    }

    toast.success("Plan generated");
    trackEvent("study_plan_created", {
      examCount: payload.subjects?.length ?? 0,
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
            Build a study plan
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Tell StudyOS your board, class, stream, and exam year, then add subjects, dates, and priorities manually. StudyOS will turn that into a clean daily plan without the extra syllabus confirmation step.
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
                      setManualSubjects(buildManualPlanSubjectsFromExams(upcomingExams));
                      setSetupNotes(["Upcoming exams were loaded into the manual builder."]);
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
                  StudyOS will suggest subjects for this exam cycle, and you can fill in the dates and priorities manually before generating the plan.
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
                    <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Suggested subjects</label>
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
              <h4 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Build it manually</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Load your selected exams or suggested subjects, then edit the subject names, exam dates, and priorities yourself. No syllabus confirmation is required.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {usesSavedExamSelection ? (
                  <Button
                    type="button"
                    onClick={loadSelectedExamsIntoManualBuilder}
                    disabled={!canLoadManualSubjects || savingContext}
                  >
                    {savingContext ? "Saving context..." : "Use selected exams"}
                  </Button>
                ) : (
                  <Button type="button" onClick={loadSuggestedSubjectsIntoManualBuilder} disabled={!canLoadManualSubjects || savingContext}>
                    {savingContext ? "Saving context..." : "Use suggested subjects"}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={addManualSubject}>
                  Add subject manually
                </Button>
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

        {manualSubjects.length ? (
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
              {manualSubjects.map((subject) => (
                <div key={subject.id} className="surface-card rounded-[24px] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Manual subject</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeManualSubject(subject.id)}>
                      Remove
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Input
                      value={subject.subject}
                      onChange={(event) => updateManualSubject(subject.id, { subject: event.target.value })}
                      placeholder="Subject"
                    />
                    <Input
                      type="date"
                      value={subject.examDate}
                      onChange={(event) => updateManualSubject(subject.id, { examDate: event.target.value })}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={subject.importance}
                      onChange={(event) => updateManualSubject(subject.id, { importance: Number(event.target.value) || 1 })}
                      placeholder="Priority 1-5"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void createPlan()} disabled={loading}>
                {loading ? "Generating..." : "Generate study plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setManualSubjects([])}>
                Start over
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
