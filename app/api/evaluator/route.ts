import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { EvaluationModel } from "@/models/Evaluation";
import { generateJsonWithFallback } from "@/lib/ai";
import { logActivity } from "@/lib/progress";

const schema = z.object({
  subject: z.string().min(2),
  question: z.string().min(5),
  answer: z.string().min(100, "Please write a more complete answer (at least 100 characters)"),
  maxMarks: z.number().min(1).max(100),
  examBoard: z.string().min(2),
  wordCount: z.number().min(1)
});

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const evaluations = await EvaluationModel.find({ userId: authResult.userId }).sort({ createdAt: -1 }).limit(5).lean();
    return NextResponse.json({ evaluations });
  } catch (error) {
    return routeError("evaluator:get", error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`evaluator:${authResult.userId}`, "evaluator");
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const result = await generateJsonWithFallback<{
      scores: {
        content: { obtained: number; max: number; comment: string };
        structure: { obtained: number; max: number; comment: string };
        language: { obtained: number; max: number; comment: string };
        examples: { obtained: number; max: number; comment: string };
        conclusion: { obtained: number; max: number; comment: string };
      };
      totalObtained: number;
      totalMax: number;
      grade: string;
      feedback: string[];
      overallComment: string;
    }>({
      systemPrompt: `You are a strict but fair senior examiner with 20 years of experience evaluating student answers. You follow ${parsed.data.examBoard} marking guidelines precisely.`,
      prompt: `Evaluate this student answer for the following exam question.

Subject: ${parsed.data.subject}
Question: ${parsed.data.question}
Total Marks: ${parsed.data.maxMarks}
Exam Board: ${parsed.data.examBoard}
Word Count: ${parsed.data.wordCount}

Student Answer:
'${parsed.data.answer}'

Evaluate on these exact parameters and allocate marks accordingly:
- Content Accuracy (40% of total): factual correctness, depth, coverage
- Structure & Organization (20%): introduction, body, conclusion, flow
- Language & Expression (15%): grammar, vocabulary, clarity
- Use of Examples (15%): relevant examples, case studies, data
- Conclusion (10%): summary, synthesis, final insight

Also provide:
- 4-6 specific actionable feedback points referencing actual lines
- Predicted grade based on score percentage

Return ONLY this exact JSON, no markdown:
{
  "scores": {
    "content": { "obtained": 0, "max": 0, "comment": "" },
    "structure": { "obtained": 0, "max": 0, "comment": "" },
    "language": { "obtained": 0, "max": 0, "comment": "" },
    "examples": { "obtained": 0, "max": 0, "comment": "" },
    "conclusion": { "obtained": 0, "max": 0, "comment": "" }
  },
  "totalObtained": 0,
  "totalMax": 0,
  "grade": "",
  "feedback": [],
  "overallComment": ""
}`
    });

    const cappedTotal = Math.min(parsed.data.maxMarks, result.data.totalObtained ?? parsed.data.maxMarks);
    const evaluation = await EvaluationModel.create({
      userId: authResult.userId,
      subject: parsed.data.subject,
      question: parsed.data.question,
      studentAnswer: parsed.data.answer,
      wordCount: parsed.data.wordCount,
      maxMarks: parsed.data.maxMarks,
      examBoard: parsed.data.examBoard,
      ...result.data,
      totalObtained: cappedTotal,
      totalMax: parsed.data.maxMarks
    });

    const events = await logActivity({
      userId: authResult.userId,
      subject: parsed.data.subject,
      type: "evaluation"
    });

    return NextResponse.json({ evaluation, events });
  } catch (error) {
    return routeError("evaluator:post", error);
  }
}
