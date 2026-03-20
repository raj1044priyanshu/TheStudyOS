import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { QuizModel } from "@/models/Quiz";
import { generateJsonWithFallback } from "@/lib/ai";
import type { QuizQuestion, QuizSubmissionAnswer } from "@/types";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`autopsy:${authResult.userId}`, "autopsy");
  if (rate) return rate;

  await connectToDatabase();
  const quiz = await QuizModel.findById(params.id);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  if (quiz.userId.toString() !== authResult.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (quiz.score === 100) {
    return NextResponse.json({
      celebration: true,
      autopsy: null
    });
  }

  if (quiz.autopsy) {
    return NextResponse.json({ autopsy: quiz.autopsy, cached: true });
  }

  const wrongAnswers = quiz.questions
    .map((question: QuizQuestion, index: number) => {
      const submitted = quiz.submittedAnswers?.find((answer: QuizSubmissionAnswer) => answer.questionIndex === index);
      if (!submitted || submitted.isCorrect) {
        return null;
      }

      return {
        question: question.question,
        studentAnswer: submitted.selectedText || submitted.selectedOption || "",
        correctAnswer: question.options[question.correct as "A" | "B" | "C" | "D"],
        allOptions: question.options
      };
    })
    .filter(Boolean);

  const prompt = `A student took a quiz on '${quiz.topic}' (${quiz.subject}).
Here are their wrong answers:
${JSON.stringify(wrongAnswers)}

For each wrong answer, classify the mistake type as exactly one of:
- misconception: student has a fundamentally wrong understanding
- silly_error: student likely knew the answer but made a careless mistake
- knowledge_gap: student simply never learned this concept
- guessed: answer pattern suggests random guessing
- time_pressure: answer changed or is inconsistent with other responses

Also identify:
- Top 3 weak topics to revise (be specific, not just the subject name)
- Top 2 strong topics from correct answers
- One sentence describing the student's overall mistake pattern

Return ONLY this exact JSON, no markdown, no explanation:
{
  "mistakeBreakdown": [{
    "questionIndex": 0,
    "questionText": "",
    "studentAnswer": "",
    "correctAnswer": "",
    "mistakeType": "",
    "explanation": ""
  }],
  "weakTopics": [{ "topic": "", "reason": "", "revisionLink": "" }],
  "strengthTopics": [],
  "overallPattern": "",
  "radarData": [{ "subject": "", "score": 0 }]
}`;

  try {
    const result = await generateJsonWithFallback<{
      mistakeBreakdown: Array<{
        questionIndex: number;
        questionText: string;
        studentAnswer: string;
        correctAnswer: string;
        mistakeType: "misconception" | "silly_error" | "knowledge_gap" | "guessed" | "time_pressure";
        explanation: string;
      }>;
      weakTopics: Array<{ topic: string; reason: string; revisionLink: string }>;
      strengthTopics: string[];
      overallPattern: string;
      radarData: Array<{ subject: string; score: number }>;
    }>({
      systemPrompt:
        "You are an expert educational psychologist analyzing a student's quiz performance to identify the root cause of each mistake.",
      prompt
    });

    quiz.autopsy = {
      ...result.data,
      weakTopics: (result.data.weakTopics ?? []).map((topic) => ({
        ...topic,
        revisionLink: topic.revisionLink || `/notes?topic=${encodeURIComponent(topic.topic)}`
      })),
      generatedAt: new Date()
    };
    await quiz.save();

    return NextResponse.json({ autopsy: quiz.autopsy, cached: false });
  } catch (error) {
    console.error("[quiz-autopsy]", error);
    return NextResponse.json({ error: "Autopsy could not be generated. Please try again." }, { status: 502 });
  }
}
