import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { FocusSessionModel } from "@/models/FocusSession";
import { ScanResultModel } from "@/models/ScanResult";
import { EvaluationModel } from "@/models/Evaluation";
import { ProgressModel } from "@/models/Progress";

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const [notes, quizzes, focusSessions, scans, evaluations, mostStudied, avgQuiz] = await Promise.all([
      NoteModel.countDocuments({ userId: authResult.userId }),
      QuizModel.countDocuments({ userId: authResult.userId, completedAt: { $ne: null } }),
      FocusSessionModel.aggregate<{ totalMinutes: number; count: number }>([
        { $match: { userId: authResult.userId } },
        { $group: { _id: null, totalMinutes: { $sum: "$duration" }, count: { $sum: 1 } } }
      ]),
      ScanResultModel.countDocuments({ userId: authResult.userId }),
      EvaluationModel.countDocuments({ userId: authResult.userId }),
      ProgressModel.aggregate<{ subject: string; minutes: number }>([
        { $match: { userId: authResult.userId } },
        { $group: { _id: "$subjectStudied", minutes: { $sum: "$minutesStudied" } } },
        { $sort: { minutes: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, subject: "$_id", minutes: 1 } }
      ]),
      QuizModel.aggregate<{ avg: number }>([
        { $match: { userId: authResult.userId, completedAt: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: "$score" } } }
      ])
    ]);

    return NextResponse.json({
      stats: {
        totalNotes: notes,
        totalQuizzes: quizzes,
        totalFocusSessions: focusSessions[0]?.count ?? 0,
        totalScans: scans,
        totalEvaluations: evaluations,
        totalStudyTime: focusSessions[0]?.totalMinutes ?? 0,
        mostStudiedSubject: mostStudied[0]?.subject ?? "—",
        averageQuizScore: Math.round(avgQuiz[0]?.avg ?? 0)
      }
    });
  } catch (error) {
    return routeError("profile:stats", error);
  }
}
