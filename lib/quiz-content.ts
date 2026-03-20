import { z } from "zod";

export const quizAnswerSchema = z.enum(["A", "B", "C", "D"]);

export const quizQuestionSchema = z.object({
  question: z.string().min(8),
  options: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1)
  }),
  correct: quizAnswerSchema,
  explanation: z.string().min(16)
});

export const generatedQuizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(20)
});

export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type GeneratedQuizQuestion = z.infer<typeof quizQuestionSchema>;

interface QuizValidationResultSuccess {
  success: true;
  questions: GeneratedQuizQuestion[];
  issues: [];
}

interface QuizValidationResultFailure {
  success: false;
  questions: null;
  issues: string[];
}

export type QuizValidationResult = QuizValidationResultSuccess | QuizValidationResultFailure;

const STOP_WORDS = new Set([
  "the",
  "that",
  "this",
  "with",
  "from",
  "into",
  "than",
  "their",
  "there",
  "which",
  "what",
  "when",
  "where",
  "your",
  "about",
  "because",
  "between",
  "after",
  "before",
  "under",
  "over",
  "each",
  "only"
]);

const META_DISALLOWED_PATTERNS = [/as an automated system/i, /i(?: think| believe)/i, /not sure/i];

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getSignificantTerms(input: string) {
  return normalizeValue(input)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term));
}

function explanationMentionsAnotherAnswer(explanation: string, correct: QuizAnswer) {
  const lower = explanation.toLowerCase();
  const matches = Array.from(
    lower.matchAll(/\b(?:correct answer|answer is|option)\s*(?:is\s*)?([a-d])\b/g)
  ).map((match) => match[1]?.toUpperCase());

  return matches.some((value) => value && value !== correct);
}

function explanationSupportsAnswer(question: GeneratedQuizQuestion) {
  const explanation = normalizeValue(question.explanation);
  const correctLabel = question.correct.toLowerCase();
  const correctOption = question.options[question.correct];
  const significantTerms = getSignificantTerms(correctOption);

  const mentionsLabel =
    explanation.includes(`option ${correctLabel}`) ||
    explanation.includes(`answer is ${correctLabel}`) ||
    explanation.includes(`correct answer is ${correctLabel}`) ||
    explanation.includes(`(${correctLabel})`);

  const matchingTerms = significantTerms.filter((term) => explanation.includes(term));
  return mentionsLabel || matchingTerms.length >= (significantTerms.length > 0 ? 1 : 0);
}

export function validateGeneratedQuiz(payload: unknown, expectedCount: number): QuizValidationResult {
  const parsed = generatedQuizSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      questions: null,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    };
  }

  const issues: string[] = [];
  const seenQuestions = new Set<string>();

  if (parsed.data.questions.length !== expectedCount) {
    issues.push(`Expected ${expectedCount} questions but received ${parsed.data.questions.length}.`);
  }

  parsed.data.questions.forEach((question, index) => {
    const questionKey = normalizeValue(question.question);
    if (seenQuestions.has(questionKey)) {
      issues.push(`Question ${index + 1} is duplicated.`);
    }
    seenQuestions.add(questionKey);

    const optionEntries = Object.entries(question.options) as Array<[QuizAnswer, string]>;
    const optionValues = optionEntries.map(([, value]) => normalizeValue(value));
    const uniqueOptions = new Set(optionValues);

    if (uniqueOptions.size !== optionValues.length) {
      issues.push(`Question ${index + 1} has duplicate answer options.`);
    }

    if (optionValues.some((value) => value === "all of the above" || value === "none of the above")) {
      issues.push(`Question ${index + 1} uses an ambiguous catch-all option.`);
    }

    if (META_DISALLOWED_PATTERNS.some((pattern) => pattern.test(question.explanation))) {
      issues.push(`Question ${index + 1} contains low-confidence or meta system phrasing.`);
    }

    if (explanationMentionsAnotherAnswer(question.explanation, question.correct)) {
      issues.push(`Question ${index + 1} explanation points to a different answer choice.`);
    }

    if (!explanationSupportsAnswer(question)) {
      issues.push(`Question ${index + 1} explanation does not support the marked answer clearly enough.`);
    }
  });

  if (issues.length > 0) {
    return {
      success: false,
      questions: null,
      issues
    };
  }

  return {
    success: true,
    questions: parsed.data.questions,
    issues: []
  };
}
