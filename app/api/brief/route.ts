export const dynamic = "force-dynamic";

import { format, getDayOfYear, subDays } from "date-fns";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { StudyPlanModel } from "@/models/StudyPlan";
import { ExamModel } from "@/models/Exam";
import { ProgressModel } from "@/models/Progress";
import { QuizModel } from "@/models/Quiz";
import { RevisionItemModel } from "@/models/RevisionItem";
import { UserModel } from "@/models/User";

const QUOTES = [
  ["Small steps compound into remarkable progress.", "StudyOS"],
  ["The best revision is the one you actually begin.", "StudyOS"],
  ["Depth beats panic when the exam gets close.", "StudyOS"],
  ["Consistency turns hard topics into familiar ones.", "StudyOS"],
  ["A calm plan outperforms last-minute chaos.", "StudyOS"],
  ["What you review today becomes confidence tomorrow.", "StudyOS"],
  ["Focus is a study skill, not a personality trait.", "StudyOS"],
  ["You do not need perfect conditions to make progress.", "StudyOS"],
  ["A solved doubt saves hours of confusion later.", "StudyOS"],
  ["Your future score is built in quiet sessions like this.", "StudyOS"],
  ["The next page matters more than the last mistake.", "StudyOS"],
  ["Understanding beats memorizing when pressure hits.", "StudyOS"],
  ["Even twenty minutes can change the whole day.", "StudyOS"],
  ["Good revision is repetition with intention.", "StudyOS"],
  ["You study better when the plan is visible.", "StudyOS"],
  ["Momentum is easier to protect than to restart.", "StudyOS"],
  ["Clarity grows every time you explain it simply.", "StudyOS"],
  ["A weak topic is just a topic asking for more reps.", "StudyOS"],
  ["Preparation feels lightest when it starts early.", "StudyOS"],
  ["One focused block is worth a distracted afternoon.", "StudyOS"],
  ["Your notes are a map; use them like one.", "StudyOS"],
  ["The hardest chapter gets smaller every time you return.", "StudyOS"],
  ["Progress is often quiet before it becomes obvious.", "StudyOS"],
  ["Revision works best when you revisit, not just reread.", "StudyOS"],
  ["Scores follow systems more often than motivation.", "StudyOS"],
  ["Your strongest days are built from ordinary ones.", "StudyOS"],
  ["A plan removes friction before it removes stress.", "StudyOS"],
  ["Learning sticks when you test yourself honestly.", "StudyOS"],
  ["A simple explanation is proof of growing mastery.", "StudyOS"],
  ["Keep going. The next session counts.", "StudyOS"]
] as const;

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const objectUserId = new Types.ObjectId(authResult.userId);
    const user = await UserModel.findById(authResult.userId).select("name totalNotesGenerated totalQuizzesTaken").lean();
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterdayDate = subDays(new Date(), 1);

    const [latestPlan, exams, yesterdayProgress, weakestTopicAgg, revisionDue] = await Promise.all([
      StudyPlanModel.findOne({ userId: authResult.userId }).sort({ createdAt: -1 }).select("generatedPlan").lean(),
      ExamModel.find({ userId: authResult.userId, examDate: { $gte: new Date() } }).sort({ examDate: 1 }).lean(),
      ProgressModel.find({ userId: authResult.userId, date: { $gte: new Date(format(yesterdayDate, "yyyy-MM-dd")) } }).lean(),
      QuizModel.aggregate<{ topic: string; subject: string; avgScore: number }>([
        { $match: { userId: objectUserId, completedAt: { $ne: null }, totalQuestions: { $gte: 3 } } },
        { $group: { _id: { topic: "$topic", subject: "$subject" }, avgScore: { $avg: "$score" } } },
        { $sort: { avgScore: 1 } },
        { $limit: 1 },
        { $project: { _id: 0, topic: "$_id.topic", subject: "$_id.subject", avgScore: 1 } }
      ]),
      RevisionItemModel.countDocuments({ userId: authResult.userId, nextReviewDate: { $lte: new Date() } })
    ]);

    const todayPlan = latestPlan?.generatedPlan?.find((day: { date: string }) => day.date === today)?.tasks ?? [];
    const totalDuration = todayPlan.reduce((sum: number, task: { duration: number }) => sum + task.duration, 0);
    const studyForecast = totalDuration < 60 ? "light" : totalDuration <= 120 ? "moderate" : "heavy";

    const hour = new Date().getHours();
    const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const quoteIndex = getDayOfYear(new Date()) % QUOTES.length;

    const isNewUser = (user?.totalNotesGenerated ?? 0) === 0 && (user?.totalQuizzesTaken ?? 0) === 0;
    return NextResponse.json({
      greeting,
      profile: {
        firstName: user?.name?.split(/\s+/)[0] ?? "Student"
      },
      dateLabel: format(new Date(), "EEEE, d MMMM yyyy"),
      quote: {
        text: QUOTES[quoteIndex][0],
        author: QUOTES[quoteIndex][1]
      },
      todayPlan,
      exams: exams.map((exam) => ({
        ...exam,
        daysUntil: Math.max(0, Math.ceil((new Date(exam.examDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
        readiness: 0,
        isPast: false
      })),
      yesterdayProgress: yesterdayProgress.length
        ? {
            quizScore: yesterdayProgress.reduce((sum, item) => sum + (item.quizScore ?? 0), 0),
            studyMinutes: yesterdayProgress.reduce((sum, item) => sum + (item.minutesStudied ?? 0), 0)
          }
        : null,
      weakestTopic: weakestTopicAgg[0] ?? null,
      revisionDue,
      studyForecast,
      isNewUser
    });
  } catch (error) {
    return routeError("brief:get", error);
  }
}
