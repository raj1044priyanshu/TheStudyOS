import { generateStructuredDataWithFallback as generateJsonWithFallback } from "@/lib/content-service";
import { resolvePlannerTemplateSubjects } from "@/lib/planner-templates";
import { extractPdfText } from "@/lib/server/pdf-text";
import { normalizeTopicList, toDateInput } from "@/lib/planner-utils";
import type { PlannerConfirmedExamInput, StudyTask, StudyStream } from "@/types";

const CBSE_CURRICULUM_URL = "https://www.cbseacademic.nic.in/curriculum18.html";
const CBSE_EXAM_CIRCULARS_URL = "https://www.cbse.gov.in/cbsenew/examination_circular.html";

const syllabusCache = new Map<string, string[]>();
const datesheetCache = new Map<string, { map: Record<string, string>; matchedYear: boolean }>();
const pdfTextCache = new Map<string, string>();

const SUBJECT_ALIASES: Record<string, string[]> = {
  Mathematics: ["mathematics", "math"],
  Physics: ["physics"],
  Chemistry: ["chemistry"],
  Biology: ["biology"],
  History: ["history"],
  Geography: ["geography"],
  English: ["english"],
  "Computer Science": ["computer science", "informatics practices", "informatics"],
  Economics: ["economics"],
  "Political Science": ["political science"],
  Accountancy: ["accountancy"],
  "Business Studies": ["business studies"],
  Psychology: ["psychology"],
  Sociology: ["sociology"],
  Other: ["other"]
};

export interface PlannerPrefillExamRecord {
  _id?: string;
  subject: string;
  examName: string;
  examDate: string;
  board?: string | null;
  syllabus?: string[];
}

interface ClassTwelveDatesheetCandidate {
  href: string;
  text: string;
}

function normalizeSubjectKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function stripHtml(input: string) {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "StudyOS Planner Prefill"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.text();
}

async function fetchPdfText(url: string) {
  if (pdfTextCache.has(url)) {
    return pdfTextCache.get(url) ?? "";
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "StudyOS Planner Prefill"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PDF request failed for ${url}`);
  }

  const extractedText = await extractPdfText(Buffer.from(await response.arrayBuffer()));
  pdfTextCache.set(url, extractedText);
  return extractedText;
}

async function findClassTwelveDatesheetCandidates() {
  const html = await fetchText(CBSE_EXAM_CIRCULARS_URL);
  const pattern = /href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  const candidates: ClassTwelveDatesheetCandidate[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(pattern)) {
    const href = match[1];
    const text = stripHtml(match[2]);
    const normalized = text.toLowerCase();

    if (normalized.includes("datesheet class xii") || normalized.includes("date sheet for class x and xii")) {
      const absoluteHref = absoluteUrl(CBSE_EXAM_CIRCULARS_URL, href);
      if (!seen.has(absoluteHref)) {
        seen.add(absoluteHref);
        candidates.push({ href: absoluteHref, text });
      }
    }
  }

  return candidates;
}

function candidateMentionsYear(candidate: ClassTwelveDatesheetCandidate, examYear: number) {
  const haystack = `${candidate.text} ${candidate.href}`.toLowerCase();
  return haystack.includes(String(examYear));
}

async function resolveClassTwelveDatesheet(examYear: number) {
  const candidates = await findClassTwelveDatesheetCandidates();
  if (!candidates.length) {
    return { pdfUrl: null, sourceText: "", matchedYear: false };
  }

  const metadataMatch = candidates.find((candidate) => candidateMentionsYear(candidate, examYear));
  if (metadataMatch) {
    return {
      pdfUrl: metadataMatch.href,
      sourceText: await fetchPdfText(metadataMatch.href).catch(() => ""),
      matchedYear: true
    };
  }

  for (const candidate of candidates.slice(0, 5)) {
    const sourceText = await fetchPdfText(candidate.href).catch(() => "");
    if (sourceText && sourceText.includes(String(examYear))) {
      return { pdfUrl: candidate.href, sourceText, matchedYear: true };
    }
  }

  const fallback = candidates[0];
  return {
    pdfUrl: fallback.href,
    sourceText: await fetchPdfText(fallback.href).catch(() => ""),
    matchedYear: false
  };
}

async function loadClassTwelveDatesheetMap(subjects: string[], examYear: number) {
  const cacheKey = `${examYear}:${subjects.map((subject) => normalizeSubjectKey(subject)).sort().join("|")}`;
  if (datesheetCache.has(cacheKey)) {
    return datesheetCache.get(cacheKey) ?? { map: {}, matchedYear: false };
  }

  const { pdfUrl, sourceText, matchedYear } = await resolveClassTwelveDatesheet(examYear);
  if (!pdfUrl) {
    return { map: {}, matchedYear: false };
  }

  if (!sourceText) {
    return { map: {}, matchedYear };
  }

  const result = await generateJsonWithFallback<Array<{ subject: string; examDate: string }>>({
    systemPrompt: "You extract exact exam schedule entries from official CBSE datesheets.",
    prompt: `Extract the Class XII CBSE board exam dates for these target subjects only:
${subjects.join(", ")}

Datesheet text:
${sourceText.slice(0, 24000)}

Return ONLY a JSON array in this exact format:
[
  { "subject": "Computer Science", "examDate": "2026-04-06" }
]

Rules:
- Use YYYY-MM-DD.
- Only include the requested subjects if they are clearly present.
- Do not invent missing subjects.
- Match the closest official subject name.`,
    shape: "array"
  });

  const map = Object.fromEntries(
    (result.data ?? []).map((item) => [normalizeSubjectKey(item.subject), item.examDate]).filter((item) => item[1])
  );
  const payload = { map, matchedYear };
  datesheetCache.set(cacheKey, payload);
  return payload;
}

async function findSyllabusLink(subject: string) {
  const html = await fetchText(CBSE_CURRICULUM_URL);
  const aliases = SUBJECT_ALIASES[subject] ?? [subject];
  const pattern = /href="([^"]+\.(?:pdf|doc|docx))"[^>]*>([\s\S]*?)<\/a>/gi;

  let bestMatch: { href: string; score: number } | null = null;

  for (const match of html.matchAll(pattern)) {
    const href = absoluteUrl(CBSE_CURRICULUM_URL, match[1]);
    const text = stripHtml(match[2]);
    const normalized = `${text} ${href}`.toLowerCase();
    let score = 0;

    for (const alias of aliases) {
      if (normalized.includes(alias.toLowerCase())) {
        score += 3;
      }
    }

    if (normalized.includes("senior secondary") || normalized.includes("class xii") || normalized.includes("class xi")) {
      score += 2;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { href, score };
    }
  }

  return bestMatch?.score ? bestMatch.href : null;
}

async function loadCbseSyllabusChapters(subject: string, className: string) {
  const cacheKey = `${className}:${subject}`;
  if (syllabusCache.has(cacheKey)) {
    return syllabusCache.get(cacheKey) ?? [];
  }

  const syllabusUrl = await findSyllabusLink(subject);
  if (!syllabusUrl || !syllabusUrl.toLowerCase().endsWith(".pdf")) {
    return [];
  }

  const sourceText = await fetchPdfText(syllabusUrl);
  if (!sourceText) {
    return [];
  }

  const result = await generateJsonWithFallback<Array<{ chapter: string }>>({
    systemPrompt: "You extract clean chapter or unit names from official CBSE syllabus documents.",
    prompt: `Extract the ordered list of chapter or unit names for ${subject} (${className}) from this CBSE syllabus text.

Syllabus text:
${sourceText.slice(0, 22000)}

Return ONLY a JSON array in this exact format:
[
  { "chapter": "Relations and Functions" }
]

Rules:
- Include only chapter or unit titles students would recognize.
- Remove numbering, boilerplate, assessment notes, and repeated headings.
- Keep the original order.
- Return at most 32 entries.`,
    shape: "array"
  });

  const chapters = normalizeTopicList((result.data ?? []).map((item) => item.chapter));
  syllabusCache.set(cacheKey, chapters);
  return chapters;
}

export async function enrichCbseExams({
  className,
  examYear,
  exams
}: {
  className: string;
  examYear: number;
  exams: PlannerPrefillExamRecord[];
}) {
  const isClassTwelve = className === "Class 12";
  const { map: dateMap, matchedYear } = isClassTwelve
    ? await loadClassTwelveDatesheetMap(exams.map((exam) => exam.subject), examYear)
    : { map: {}, matchedYear: false };
  const notes: string[] = [];

  if (isClassTwelve && !matchedYear) {
    notes.push(`No exact Class XII CBSE datesheet match for ${examYear} was found. StudyOS used the latest available CBSE datesheet instead.`);
  }

  const confirmedExams: PlannerConfirmedExamInput[] = [];

  for (const exam of exams) {
    const savedExamDate = toDateInput(exam.examDate);
    const officialExamDate = dateMap[normalizeSubjectKey(exam.subject)] ?? null;
    const officialChapters = await loadCbseSyllabusChapters(exam.subject, className).catch(() => []);
    const savedChapters = normalizeTopicList(exam.syllabus ?? []);
    const chapters = savedChapters.length ? savedChapters : officialChapters;

    if (!chapters.length) {
      notes.push(`No official chapter list was found for ${exam.subject}. Add or edit chapters manually before generating the plan.`);
    }

    if (officialExamDate && officialExamDate !== savedExamDate) {
      notes.push(
        savedExamDate
          ? `${exam.subject} has a saved date of ${savedExamDate} but the latest CBSE datesheet suggests ${officialExamDate}.`
          : `${exam.subject} picked up an official CBSE datesheet date of ${officialExamDate}.`
      );
    }

    confirmedExams.push({
      examId: exam._id,
      subject: exam.subject,
      examName: exam.examName,
      examDate: officialExamDate ?? savedExamDate,
      board: exam.board ?? "CBSE",
      chapters,
      source: savedChapters.length && officialChapters.length ? "saved+official" : savedChapters.length ? "saved" : officialChapters.length ? "official" : "manual",
      officialExamDate,
      notes:
        officialExamDate && officialExamDate !== savedExamDate
          ? savedExamDate
            ? `Official CBSE datesheet currently points to ${officialExamDate}.`
            : `Official CBSE datesheet currently points to ${officialExamDate}.`
          : undefined
    });
  }

  return { confirmedExams, notes };
}

function buildAutoExamName({
  board,
  className,
  examYear,
  subject
}: {
  board: string;
  className: string;
  examYear: number;
  subject: string;
}) {
  if (board.trim().toUpperCase() === "CBSE" && className === "Class 12") {
    return `CBSE Board Exam ${examYear}`;
  }

  return `${board} ${className} ${examYear} ${subject} Exam`;
}

export async function buildAutoPlannerExams({
  className,
  board,
  stream,
  examYear,
  profileSubjects = []
}: {
  className: string;
  board: string;
  stream?: StudyStream | "";
  examYear: number;
  profileSubjects?: string[];
}) {
  const subjects = resolvePlannerTemplateSubjects({ stream, profileSubjects });
  if (!subjects.length) {
    return {
      confirmedExams: [] as PlannerConfirmedExamInput[],
      notes: ["No subjects were available for this flow. Add your subjects in onboarding/profile before preparing the plan."]
    };
  }

  const upperBoard = board.trim().toUpperCase();

  if (upperBoard === "CBSE" && className === "Class 12") {
    return enrichCbseExams({
      className,
      examYear,
      exams: subjects.map((subject) => ({
        subject,
        examName: buildAutoExamName({ board: "CBSE", className, examYear, subject }),
        examDate: "",
        board: "CBSE",
        syllabus: []
      }))
    });
  }

  const confirmedExams: PlannerConfirmedExamInput[] = [];
  const notes: string[] = [];

  for (const subject of subjects) {
    const officialChapters = upperBoard === "CBSE" ? await loadCbseSyllabusChapters(subject, className).catch(() => []) : [];

    confirmedExams.push({
      subject,
      examName: buildAutoExamName({ board, className, examYear, subject }),
      examDate: "",
      board,
      chapters: officialChapters,
      source: officialChapters.length ? "official" : "manual",
      notes: officialChapters.length
        ? `Confirm the exam date for ${examYear} before generating the plan.`
        : `Confirm the exam date for ${examYear} and add chapters manually before generating the plan.`
    });

    if (!officialChapters.length) {
      notes.push(`No official chapter list was found for ${subject}. Add chapters manually before generating the plan.`);
    }
  }

  if (upperBoard === "CBSE") {
    notes.push(`CBSE ${className} chapter lists were prefilled where available, but exam dates for ${examYear} still need confirmation.`);
  } else {
    notes.push(`Official ${board} exam dates and chapters were not available, so every exam stays fully editable for manual confirmation.`);
  }

  return { confirmedExams, notes };
}

export function buildChapterPlan({
  confirmedExams,
  focusTopics,
  hoursPerDay,
  startDate
}: {
  confirmedExams: PlannerConfirmedExamInput[];
  focusTopics: string[];
  hoursPerDay: number;
  startDate: string;
}) {
  const start = new Date(`${startDate}T00:00:00`);
  const latestExamDate = confirmedExams
    .map((exam) => new Date(`${exam.examDate}T00:00:00`))
    .filter((date) => !Number.isNaN(date.valueOf()))
    .sort((left, right) => left.getTime() - right.getTime())
    .at(-1);

  const maxDays = latestExamDate
    ? Math.max(7, Math.min(56, Math.round((latestExamDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1))
    : 21;

  const queue = confirmedExams
    .slice()
    .sort((left, right) => new Date(left.examDate).getTime() - new Date(right.examDate).getTime())
    .flatMap((exam) => {
      const chapters = normalizeTopicList(exam.chapters);
      const safeChapters = chapters.length ? chapters : [`${exam.subject} core revision`];

      return safeChapters.map((chapter, index) => ({
        examId: exam.examId ?? null,
        examName: exam.examName,
        subject: exam.subject,
        examDate: exam.examDate,
        chapter,
        source: exam.source,
        weight:
          safeChapters.length - index +
          (focusTopics.some((topic) => chapter.toLowerCase().includes(topic.toLowerCase())) ? 4 : 0)
      }));
    })
    .sort((left, right) => {
      const dateDelta = new Date(left.examDate).getTime() - new Date(right.examDate).getTime();
      if (dateDelta !== 0) {
        return dateDelta;
      }
      return right.weight - left.weight;
    });

  const slotsPerDay = hoursPerDay >= 6 ? 3 : hoursPerDay >= 3 ? 2 : 1;
  const totalMinutes = Math.max(60, Math.round(hoursPerDay * 60));
  const breakMinutes = slotsPerDay > 1 ? 15 : 0;
  const slotMinutes = Math.max(35, Math.round((totalMinutes - breakMinutes * Math.max(0, slotsPerDay - 1)) / slotsPerDay));
  const days: Array<{ date: string; tasks: StudyTask[] }> = [];

  for (let dayIndex = 0; dayIndex < maxDays && queue.length > 0; dayIndex += 1) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + dayIndex);
    const isoDate = currentDate.toISOString().slice(0, 10);
    const tasks: StudyTask[] = [];

    for (let slotIndex = 0; slotIndex < slotsPerDay && queue.length > 0; slotIndex += 1) {
      const nextChapter = queue.shift();
      if (!nextChapter) {
        break;
      }

      tasks.push({
        subject: nextChapter.subject,
        topic: nextChapter.chapter,
        chapter: nextChapter.chapter,
        examId: nextChapter.examId,
        examName: nextChapter.examName,
        duration: slotMinutes,
        type: "study",
        completed: false,
        checkpointStatus: "not_started",
        checkpointId: null,
        checkpointScore: null
      });

      if (slotIndex < slotsPerDay - 1 && queue.length > 0) {
        tasks.push({
          subject: "Break",
          topic: "Short break",
          duration: breakMinutes,
          type: "break",
          completed: false,
          checkpointStatus: "passed"
        });
      }
    }

    if (tasks.length) {
      days.push({ date: isoDate, tasks });
    }
  }

  if (!days.length) {
    const fallbackExam = confirmedExams[0];
    return [
      {
        date: startDate,
        tasks: [
          {
            subject: fallbackExam?.subject ?? "General",
            topic: fallbackExam?.chapters[0] ?? "Core revision",
            chapter: fallbackExam?.chapters[0] ?? "Core revision",
            examId: fallbackExam?.examId ?? null,
            examName: fallbackExam?.examName ?? null,
            duration: 60,
            type: "study" as const,
            completed: false,
            checkpointStatus: "not_started" as const,
            checkpointId: null,
            checkpointScore: null
          }
        ]
      }
    ];
  }

  return days;
}
