import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { EvaluationModel } from "@/models/Evaluation";
import { generateTextWithFallback as generatePlainTextWithFallback } from "@/lib/content-service";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const evaluation = await EvaluationModel.findOne({ _id: params.id, userId: authResult.userId });
    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    if (evaluation.improvedAnswer) {
      return NextResponse.json({ improvedAnswer: evaluation.improvedAnswer, cached: true });
    }

    const improvedAnswer = await generatePlainTextWithFallback(
      `Here is a student answer to '${evaluation.question}' that scored
${evaluation.totalObtained}/${evaluation.totalMax}. The examiner feedback was: ${evaluation.feedback.join(" | ")}.
Rewrite this answer to score full marks. Keep the student's voice
but fix all issues identified. Answer: '${evaluation.studentAnswer}'.
Return ONLY the improved answer text, no JSON, no preamble.`
    );

    evaluation.improvedAnswer = improvedAnswer.trim();
    await evaluation.save();

    return NextResponse.json({ improvedAnswer: evaluation.improvedAnswer, cached: false });
  } catch (error) {
    return routeError("evaluator:improve", error);
  }
}
