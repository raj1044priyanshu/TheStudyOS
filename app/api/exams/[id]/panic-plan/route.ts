import { differenceInCalendarDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { ExamModel } from "@/models/Exam";
import { QuizModel } from "@/models/Quiz";
import { ProgressModel } from "@/models/Progress";
import { generateJsonWithFallback } from "@/lib/ai";

async function computeReadiness(userId: string, subject: string) {
  const [quizAgg, progressAgg] = await Promise.all([
    QuizModel.aggregate<{ avg: number }>([
      { $match: { userId, subject, completedAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$score" } } }
    ]),
    ProgressModel.aggregate<{ totalMinutes: number }>([
      { $match: { userId, subjectStudied: subject } },
      { $group: { _id: null, totalMinutes: { $sum: "$minutesStudied" } } }
    ])
  ]);

  const quizPerformance = (quizAgg[0]?.avg ?? 0) * 0.35;
  const studyTime = Math.min(((progressAgg[0]?.totalMinutes ?? 0) / 60) / 20, 1) * 25;
  return Math.max(0, Math.min(100, Math.round(quizPerformance + studyTime)));
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const exam = await ExamModel.findOne({ _id: params.id, userId: authResult.userId }).lean();
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const readiness = await computeReadiness(authResult.userId, exam.subject);
    const daysUntil = Math.max(1, differenceInCalendarDays(new Date(exam.examDate), new Date()));
    const weakTopics = await QuizModel.aggregate<{ topic: string; score: number }>([
      { $match: { userId: exam.userId, subject: exam.subject, completedAt: { $ne: null } } },
      { $group: { _id: "$topic", score: { $avg: "$score" } } },
      { $sort: { score: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, topic: "$_id", score: 1 } }
    ]);

    const result = await generateJsonWithFallback<{
      plan: Array<{
        date: string;
        sessions: Array<{ time: "morning" | "afternoon" | "evening"; topic: string; technique: string; duration: number }>;
      }>;
    }>({
      prompt: `A student has an exam on '${exam.subject}' in ${daysUntil} days.
Their readiness score is ${readiness}%. Their weak topics are: ${weakTopics.map((item) => item.topic).join(", ")}.
Create an EMERGENCY crash revision plan for exactly ${daysUntil} days.
Be brutally focused — only the highest-priority topics.
Include: morning session, afternoon session, evening session per day.
Add specific revision techniques (mind map, past papers, formula drill).
Return ONLY JSON:
{ "plan": [{ "date": "${format(new Date(), "yyyy-MM-dd")}", "sessions": [{
"time": "morning", "topic": "", "technique": "", "duration": 60 }] }] }`
    });

    return NextResponse.json({ plan: result.data.plan ?? [] });
  } catch (error) {
    return routeError("exams:panic-plan", error);
  }
}
