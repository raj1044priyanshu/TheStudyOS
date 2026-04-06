import type { HydratedDocument } from "mongoose";
import { generateStructuredDataWithFallback } from "@/lib/content-service";
import { PlannerCheckpointModel } from "@/models/PlannerCheckpoint";

type PlannerQuestionType = "objective" | "fill_blank" | "short" | "long" | "numerical" | "case";
type PlannerDifficulty = "easy" | "medium" | "hard";

interface PlannerTaskContext {
  userId: string;
  planId: string;
  date: string;
  taskIndex: number;
  subject: string;
  chapter: string;
  examName?: string;
  board?: string;
  className?: string;
  stream?: string;
}

interface PlannerQuestionBlueprint {
  type: PlannerQuestionType;
  maxMarks: number;
  difficulty: PlannerDifficulty;
}

interface PlannerCheckpointQuestionRecord {
  prompt: string;
  concept: string;
  difficulty: PlannerDifficulty;
  type: PlannerQuestionType;
  options?: string[];
  answerKey?: string;
  rubric?: string;
  maxMarks: number;
}

interface PlannerQuestionResultRecord {
  questionIndex: number;
  obtainedMarks: number;
  maxMarks: number;
  feedback: string;
  recommendedAction: string;
  concept: string;
  questionType: PlannerQuestionType;
  difficulty: PlannerDifficulty;
}

interface PlannerCheckpointAttemptRecord {
  submittedAt: Date;
  answers: string[];
  score: number;
  passed: boolean;
  obtainedMarks: number;
  totalMarks: number;
  feedback: string[];
  questionResults: PlannerQuestionResultRecord[];
}

type PlannerCheckpointDoc = HydratedDocument<{
  _id: string;
  userId: string;
  planId: string;
  date: string;
  taskIndex: number;
  subject: string;
  chapter: string;
  examName: string;
  board: string;
  className: string;
  stream: string;
  coverageOutline: string[];
  questions: PlannerCheckpointQuestionRecord[];
  status: "generated" | "submitted";
  score: number;
  passed: boolean;
  feedback: string[];
  obtainedMarks: number;
  totalMarks: number;
  latestAttemptAt: Date | null;
  questionResults: PlannerQuestionResultRecord[];
  attempts: PlannerCheckpointAttemptRecord[];
}>;

function normalizeList(items: string[]) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const item of items) {
    const normalized = item.trim().replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    values.push(normalized);
  }

  return values;
}

export function getAssessmentQuestionCount(subtopicCount: number) {
  if (subtopicCount <= 4) return 10;
  if (subtopicCount <= 6) return 15;
  if (subtopicCount <= 8) return 20;
  return 25;
}

function addBlueprints(target: PlannerQuestionBlueprint[], count: number, type: PlannerQuestionType, maxMarks: number, difficulty: PlannerDifficulty) {
  for (let index = 0; index < count; index += 1) {
    target.push({ type, maxMarks, difficulty });
  }
}

export function buildQuestionBlueprint(questionCount: number): PlannerQuestionBlueprint[] {
  const blueprint: PlannerQuestionBlueprint[] = [];

  if (questionCount === 10) {
    addBlueprints(blueprint, 4, "objective", 2, "easy");
    addBlueprints(blueprint, 1, "fill_blank", 2, "easy");
    addBlueprints(blueprint, 1, "numerical", 2, "medium");
    addBlueprints(blueprint, 3, "short", 4, "medium");
    addBlueprints(blueprint, 1, "case", 6, "hard");
    return blueprint;
  }

  if (questionCount === 15) {
    addBlueprints(blueprint, 5, "objective", 2, "easy");
    addBlueprints(blueprint, 2, "fill_blank", 2, "medium");
    addBlueprints(blueprint, 1, "numerical", 2, "medium");
    addBlueprints(blueprint, 5, "short", 4, "medium");
    addBlueprints(blueprint, 1, "long", 6, "hard");
    addBlueprints(blueprint, 1, "case", 6, "hard");
    return blueprint;
  }

  if (questionCount === 20) {
    addBlueprints(blueprint, 7, "objective", 2, "easy");
    addBlueprints(blueprint, 2, "fill_blank", 2, "medium");
    addBlueprints(blueprint, 2, "numerical", 2, "medium");
    addBlueprints(blueprint, 6, "short", 4, "medium");
    addBlueprints(blueprint, 2, "long", 6, "hard");
    addBlueprints(blueprint, 1, "case", 6, "hard");
    return blueprint;
  }

  addBlueprints(blueprint, 8, "objective", 2, "easy");
  addBlueprints(blueprint, 3, "fill_blank", 2, "medium");
  addBlueprints(blueprint, 2, "numerical", 2, "medium");
  addBlueprints(blueprint, 8, "short", 4, "medium");
  addBlueprints(blueprint, 2, "long", 6, "hard");
  addBlueprints(blueprint, 2, "case", 6, "hard");
  return blueprint;
}

async function generateCoverageOutline(task: PlannerTaskContext) {
  const result = await generateStructuredDataWithFallback<{ coverageOutline: string[] }>({
    prompt: `Create a concise chapter coverage outline for a student assessment.

Subject: ${task.subject}
Chapter: ${task.chapter}
Exam: ${task.examName || "Upcoming exam"}
Board: ${task.board || "General school curriculum"}
Class: ${task.className || ""}
Stream: ${task.stream || ""}

Return JSON only:
{
  "coverageOutline": ["subtopic 1", "subtopic 2"]
}

Rules:
- Return between 3 and 10 unique subtopics.
- Keep subtopics specific enough to assess separately.
- Use textbook-safe language only.`,
    systemPrompt: "You design precise chapter coverage maps for school assessments. Return valid JSON only.",
    context: {
      route: "planner-checkpoint:coverage",
      userId: task.userId,
      entityType: "planner-checkpoint",
      entityId: `${task.planId}:${task.date}:${task.taskIndex}`
    }
  });

  const coverageOutline = normalizeList(result.data.coverageOutline ?? []).slice(0, 10);
  if (coverageOutline.length >= 3) {
    return coverageOutline;
  }

  return normalizeList(
    task.chapter
      .split(/,|:|;| and /i)
      .map((item) => item.trim())
      .filter(Boolean)
  ).slice(0, 4);
}

function buildQuestionGenerationPrompt(task: PlannerTaskContext, coverageOutline: string[], blueprint: PlannerQuestionBlueprint[]) {
  return `Create a chapter assessment from this exact blueprint.

Subject: ${task.subject}
Chapter: ${task.chapter}
Exam: ${task.examName || "Upcoming exam"}
Board: ${task.board || "General school curriculum"}
Class: ${task.className || ""}
Stream: ${task.stream || ""}
Coverage outline: ${JSON.stringify(coverageOutline)}
Question blueprint: ${JSON.stringify(blueprint)}

Return JSON only:
{
  "questions": [
    {
      "prompt": "",
      "concept": "",
      "difficulty": "easy",
      "type": "objective",
      "options": ["", "", "", ""],
      "answerKey": "",
      "rubric": "",
      "maxMarks": 2
    }
  ]
}

Rules:
- Return exactly ${blueprint.length} questions in the same order as the blueprint.
- Each question must stay inside the matching blueprint type, difficulty, and maxMarks.
- Spread questions across the provided coverage outline.
- Objective questions must include exactly 4 options and an answerKey equal to the correct option text.
- Fill-blank and numerical questions must include a short exact answerKey.
- Short, long, and case questions must include a clear rubric.
- Case questions should include a short scenario plus a prompt.
- Keep everything school-safe, precise, and exam-ready.`;
}

function validateGeneratedQuestions(rawQuestions: unknown, blueprint: PlannerQuestionBlueprint[], coverageOutline: string[]) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length !== blueprint.length) {
    return null;
  }

  const normalized: PlannerCheckpointQuestionRecord[] = [];

  for (const [index, question] of rawQuestions.entries()) {
    if (!question || typeof question !== "object") {
      return null;
    }

    const typedQuestion = question as Record<string, unknown>;
    const blueprintEntry = blueprint[index];
    const prompt = String(typedQuestion.prompt ?? "").trim();
    const concept = String(typedQuestion.concept ?? "").trim();
    const type = String(typedQuestion.type ?? "").trim() as PlannerQuestionType;
    const difficulty = String(typedQuestion.difficulty ?? "").trim() as PlannerDifficulty;
    const maxMarks = Number(typedQuestion.maxMarks ?? blueprintEntry.maxMarks);

    if (!prompt || !concept || type !== blueprintEntry.type || difficulty !== blueprintEntry.difficulty || maxMarks !== blueprintEntry.maxMarks) {
      return null;
    }

    const normalizedQuestion: PlannerCheckpointQuestionRecord = {
      prompt,
      concept: coverageOutline.find((item) => item.toLowerCase() === concept.toLowerCase()) || concept,
      difficulty,
      type,
      maxMarks
    };

    if (type === "objective") {
      const options = Array.isArray(typedQuestion.options) ? typedQuestion.options.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
      const answerKey = String(typedQuestion.answerKey ?? "").trim();
      if (options.length !== 4 || !answerKey) {
        return null;
      }
      normalizedQuestion.options = options;
      normalizedQuestion.answerKey = answerKey;
      normalizedQuestion.rubric = "";
    } else if (type === "fill_blank" || type === "numerical") {
      const answerKey = String(typedQuestion.answerKey ?? "").trim();
      if (!answerKey) {
        return null;
      }
      normalizedQuestion.answerKey = answerKey;
      normalizedQuestion.rubric = "";
    } else {
      const rubric = String(typedQuestion.rubric ?? "").trim();
      if (!rubric) {
        return null;
      }
      normalizedQuestion.rubric = rubric;
      normalizedQuestion.answerKey = "";
    }

    normalized.push(normalizedQuestion);
  }

  return normalized;
}

async function generateAssessmentQuestions(task: PlannerTaskContext, coverageOutline: string[]) {
  const blueprint = buildQuestionBlueprint(getAssessmentQuestionCount(coverageOutline.length));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const generated = await generateStructuredDataWithFallback<{ questions: unknown[] }>({
      prompt: `${buildQuestionGenerationPrompt(task, coverageOutline, blueprint)}

${attempt === 0 ? "" : "The previous response did not follow the blueprint exactly. Regenerate the full JSON from scratch and match the blueprint perfectly."}`.trim(),
      systemPrompt: "You create school assessment papers that strictly follow the requested JSON blueprint. Return valid JSON only.",
      context: {
        route: "planner-checkpoint:questions",
        userId: task.userId,
        entityType: "planner-checkpoint",
        entityId: `${task.planId}:${task.date}:${task.taskIndex}`
      }
    });

    const normalized = validateGeneratedQuestions(generated.data.questions, blueprint, coverageOutline);
    if (normalized) {
      return normalized;
    }
  }

  throw new Error("We couldn't generate a reliable assessment for this chapter.");
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}.%/+-]+/gu, "");
}

function evaluateDeterministicQuestion(question: PlannerCheckpointQuestionRecord, answer: string, questionIndex: number) {
  const cleanedAnswer = answer.trim();
  const normalizedAnswer = normalizeAnswer(cleanedAnswer);
  const normalizedKey = normalizeAnswer(question.answerKey || "");
  const isCorrect = Boolean(normalizedAnswer) && normalizedAnswer === normalizedKey;

  return {
    questionIndex,
    obtainedMarks: isCorrect ? question.maxMarks : 0,
    maxMarks: question.maxMarks,
    feedback: isCorrect ? "Correct." : `Review ${question.concept} and revisit the exact answer.`,
    recommendedAction: isCorrect ? `Keep revising ${question.concept} with mixed practice.` : `Revise ${question.concept} before retrying this chapter.`,
    concept: question.concept,
    questionType: question.type,
    difficulty: question.difficulty
  } satisfies PlannerQuestionResultRecord;
}

async function evaluateSubjectiveQuestions({
  checkpoint,
  answers,
  subjectiveIndexes
}: {
  checkpoint: PlannerCheckpointDoc;
  answers: string[];
  subjectiveIndexes: number[];
}) {
  if (!subjectiveIndexes.length) {
    return {
      feedback: [] as string[],
      questionResults: [] as PlannerQuestionResultRecord[]
    };
  }

  const generated = await generateStructuredDataWithFallback<{
    feedback: string[];
    questionResults: Array<{
      questionIndex: number;
      obtainedMarks: number;
      feedback: string;
      recommendedAction: string;
    }>;
  }>({
    prompt: `Evaluate these subjective chapter-assessment answers.

Subject: ${checkpoint.subject}
Chapter: ${checkpoint.chapter}
Questions: ${JSON.stringify(subjectiveIndexes.map((index) => checkpoint.questions[index]))}
Student answers: ${JSON.stringify(subjectiveIndexes.map((index) => ({ questionIndex: index, answer: answers[index] ?? "" })))}

Return JSON only:
{
  "feedback": ["", ""],
  "questionResults": [
    {
      "questionIndex": 0,
      "obtainedMarks": 0,
      "feedback": "",
      "recommendedAction": ""
    }
  ]
}

Rules:
- Grade only against the question rubric.
- obtainedMarks must be between 0 and the question maxMarks.
- feedback must mention what is missing or what is strong.
- recommendedAction must tell the student what to practice next.
- Keep feedback short, specific, and student-safe.`,
    systemPrompt: "You are a strict but supportive school assessment evaluator. Return valid JSON only.",
    context: {
      route: "planner-checkpoint:evaluate-subjective",
      userId: checkpoint.userId,
      entityType: "planner-checkpoint",
      entityId: checkpoint._id.toString()
    }
  });

  const questionResults = (generated.data.questionResults ?? [])
    .map((result) => {
      const question = checkpoint.questions[result.questionIndex];
      if (!question) {
        return null;
      }

      return {
        questionIndex: result.questionIndex,
        obtainedMarks: Math.max(0, Math.min(question.maxMarks, Math.round(result.obtainedMarks ?? 0))),
        maxMarks: question.maxMarks,
        feedback: String(result.feedback ?? "").trim(),
        recommendedAction: String(result.recommendedAction ?? "").trim(),
        concept: question.concept,
        questionType: question.type,
        difficulty: question.difficulty
      } satisfies PlannerQuestionResultRecord;
    })
    .filter((value): value is PlannerQuestionResultRecord => Boolean(value));

  return {
    feedback: normalizeList((generated.data.feedback ?? []).map((item) => String(item ?? ""))).slice(0, 6),
    questionResults
  };
}

function buildFallbackFeedback(results: PlannerQuestionResultRecord[]) {
  const weakResults = results
    .filter((result) => result.obtainedMarks < result.maxMarks)
    .sort((left, right) => left.obtainedMarks / left.maxMarks - right.obtainedMarks / right.maxMarks)
    .slice(0, 4);

  if (!weakResults.length) {
    return ["Strong chapter performance. Keep revising with one more mixed round to lock this in."];
  }

  return weakResults.map((result) => `Work on ${result.concept} through ${result.questionType.replace("_", " ")} practice.`);
}

export async function createOrGetPlannerCheckpoint(task: PlannerTaskContext) {
  const existing = await PlannerCheckpointModel.findOne({
    userId: task.userId,
    planId: task.planId,
    date: task.date,
    taskIndex: task.taskIndex
  });

  if (existing) {
    return existing as PlannerCheckpointDoc;
  }

  const coverageOutline = await generateCoverageOutline(task);
  const questions = await generateAssessmentQuestions(task, coverageOutline);
  const checkpoint = await PlannerCheckpointModel.create({
    userId: task.userId,
    planId: task.planId,
    date: task.date,
    taskIndex: task.taskIndex,
    subject: task.subject,
    chapter: task.chapter,
    examName: task.examName || "",
    board: task.board || "",
    className: task.className || "",
    stream: task.stream || "",
    coverageOutline,
    questions,
    totalMarks: questions.reduce((total, question) => total + question.maxMarks, 0)
  });

  return checkpoint as PlannerCheckpointDoc;
}

export async function evaluatePlannerCheckpointAttempt(checkpoint: PlannerCheckpointDoc, answers: string[]) {
  const normalizedAnswers = Array.from({ length: checkpoint.questions.length }, (_, index) => answers[index]?.trim() || "");
  const deterministicResults = checkpoint.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => ["objective", "fill_blank", "numerical"].includes(question.type))
    .map(({ question, index }) => evaluateDeterministicQuestion(question, normalizedAnswers[index], index));

  const subjectiveIndexes = checkpoint.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => ["short", "long", "case"].includes(question.type))
    .map(({ index }) => index);

  const subjectiveEvaluation = await evaluateSubjectiveQuestions({
    checkpoint,
    answers: normalizedAnswers,
    subjectiveIndexes
  });

  const questionResults = [...deterministicResults, ...subjectiveEvaluation.questionResults].sort(
    (left, right) => left.questionIndex - right.questionIndex
  );
  const obtainedMarks = questionResults.reduce((total, result) => total + result.obtainedMarks, 0);
  const totalMarks = checkpoint.questions.reduce((total, question) => total + question.maxMarks, 0);
  const score = totalMarks === 0 ? 0 : Math.round((obtainedMarks / totalMarks) * 100);
  const passed = score >= 50;
  const feedback = subjectiveEvaluation.feedback.length ? subjectiveEvaluation.feedback : buildFallbackFeedback(questionResults);

  const attempt: PlannerCheckpointAttemptRecord = {
    submittedAt: new Date(),
    answers: normalizedAnswers,
    score,
    passed,
    obtainedMarks,
    totalMarks,
    feedback,
    questionResults
  };

  checkpoint.status = "submitted";
  checkpoint.score = score;
  checkpoint.passed = passed;
  checkpoint.feedback = feedback;
  checkpoint.obtainedMarks = obtainedMarks;
  checkpoint.totalMarks = totalMarks;
  checkpoint.latestAttemptAt = attempt.submittedAt;
  checkpoint.questionResults = questionResults;
  checkpoint.attempts = [...(checkpoint.attempts ?? []), attempt];
  await checkpoint.save();

  return checkpoint;
}
