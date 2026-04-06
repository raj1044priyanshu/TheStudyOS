import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildValidationErrorResponse, requireRateLimitedUser, requireUser, routeError } from "@/lib/api";
import { ExamModel } from "@/models/Exam";
import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { ProgressModel } from "@/models/Progress";
import { markFeatureUsed } from "@/lib/progress";

const schema = z.object({
  subject: z.string().min(2),
  examName: z.string().min(2),
  examDate: z.string().min(1),
  board: z.string().optional(),
  syllabus: z.array(z.string()).optional()
});

async function computeReadiness(userId: string, subject: string) {
  const [notesCount, quizAgg, progressAgg] = await Promise.all([
    NoteModel.countDocuments({ userId, subject }),
    QuizModel.aggregate<{ avg: number }>([
      { $match: { userId, subject, completedAt: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$score" } } }
    ]),
    ProgressModel.aggregate<{ totalMinutes: number }>([
      { $match: { userId, subjectStudied: subject } },
      { $group: { _id: null, totalMinutes: { $sum: "$minutesStudied" } } }
    ])
  ]);

  const notesCoverage = Math.min(notesCount / 10, 1) * 40;
  const quizPerformance = (quizAgg[0]?.avg ?? 0) * 0.35;
  const hoursStudied = (progressAgg[0]?.totalMinutes ?? 0) / 60;
  const studyTime = Math.min(hoursStudied / 20, 1) * 25;
  return Math.max(0, Math.min(100, Math.round(notesCoverage + quizPerformance + studyTime)));
}

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const exams = await ExamModel.find({ userId: authResult.userId }).sort({ examDate: 1 }).lean();

    const payload = await Promise.all(
      exams.map(async (exam) => {
        const readiness = await computeReadiness(authResult.userId, exam.subject);
        return {
          ...exam,
          readiness,
          daysUntil: differenceInCalendarDays(new Date(exam.examDate), new Date()),
          isPast: new Date(exam.examDate).getTime() < Date.now()
        };
      })
    );

    return NextResponse.json({ exams: payload });
  } catch (error) {
    return routeError("exams:get", error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "examMutation",
      key: "exam-create"
    });
    if (authResult.error) return authResult.error;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error);
    }

    const examDate = new Date(parsed.data.examDate);
    if (Number.isNaN(examDate.valueOf()) || examDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Exam date must be in the future" }, { status: 400 });
    }

    await connectToDatabase();
    const exam = await ExamModel.create({
      userId: authResult.userId,
      ...parsed.data,
      examDate
    });
    await markFeatureUsed(authResult.userId, "exams");

    return NextResponse.json({ exam });
  } catch (error) {
    return routeError("exams:post", error);
  }
}
