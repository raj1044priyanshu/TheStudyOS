import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { PastPaperModel } from "@/models/PastPaper";
import { generateStructuredDataWithFallback as generateJsonWithFallback } from "@/lib/content-service";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const paper = await PastPaperModel.findOne({ _id: params.id, userId: authResult.userId });
    if (!paper) {
      return NextResponse.json({ error: "Past paper not found" }, { status: 404 });
    }

    if (paper.practiceQuestions?.length) {
      return NextResponse.json({ questions: paper.practiceQuestions, cached: true });
    }

    const topTopics = (paper.predictedTopics ?? [])
      .slice(0, 3)
      .map((topic: { topic: string }) => topic.topic)
      .join(", ");
    const result = await generateJsonWithFallback<{
      questions: Array<{ question: string; modelAnswer: string; marks: number; topic: string }>;
    }>({
      prompt: `Based on this ${paper.subject} exam paper pattern where the most tested
topics are ${topTopics}, generate 5 practice questions in the same style
and difficulty as the original paper. Mix question types.
Return ONLY JSON:
{ "questions": [{ "question": "", "modelAnswer": "", "marks": 0, "topic": "" }] }`
    });

    paper.practiceQuestions = result.data.questions ?? [];
    await paper.save();

    return NextResponse.json({ questions: paper.practiceQuestions, cached: false });
  } catch (error) {
    return routeError("past-papers:practice", error);
  }
}
