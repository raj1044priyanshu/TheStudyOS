import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireRateLimitedUser } from "@/lib/api";
import { SEARCH_SHORTCUTS, filterSearchShortcuts } from "@/lib/search-shortcuts";
import { ExamModel } from "@/models/Exam";
import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { RevisionItemModel } from "@/models/RevisionItem";
import { StudyPlanModel } from "@/models/StudyPlan";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const authResult = await requireRateLimitedUser(request, {
    policy: "search",
    key: "search"
  });
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  await connectToDatabase();
  const regex = new RegExp(escapeRegex(q), "i");
  const startsWithRegex = new RegExp(`^${escapeRegex(q)}`, "i");

  const [notes, quizzes, plans, revisions, exams] = await Promise.all([
    NoteModel.find({
      userId: authResult.userId,
      $or: [{ title: startsWithRegex }, { topic: startsWithRegex }, { subject: startsWithRegex }, { title: regex }, { topic: regex }]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id title subject topic createdAt")
      .lean(),
    QuizModel.find({
      userId: authResult.userId,
      $or: [{ topic: regex }, { subject: regex }]
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select("_id topic subject completedAt")
      .lean(),
    StudyPlanModel.find({
      userId: authResult.userId,
      $or: [{ name: regex }, { "subjects.name": regex }]
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("_id name subjects")
      .lean(),
    RevisionItemModel.find({
      userId: authResult.userId,
      $or: [{ topic: regex }, { subject: regex }]
    })
      .sort({ nextReviewDate: 1 })
      .limit(4)
      .select("_id topic subject nextReviewDate")
      .lean(),
    ExamModel.find({
      userId: authResult.userId,
      $or: [{ examName: regex }, { subject: regex }, { board: regex }]
    })
      .sort({ examDate: 1 })
      .limit(4)
      .select("_id examName subject examDate board")
      .lean()
  ]);

  const noteResults = notes.map((note) => ({
    id: note._id.toString(),
    type: "note" as const,
    title: note.title,
    subtitle: `${note.subject} • ${note.topic} • ${new Date(note.createdAt).toLocaleDateString("en-IN")}`,
    href: `/dashboard/notes/${note._id.toString()}`
  }));

  const quizResults = quizzes.map((quiz) => ({
    id: quiz._id.toString(),
    type: "quiz" as const,
    title: `${quiz.subject}: ${quiz.topic}`,
    subtitle: quiz.completedAt ? "Completed quiz" : "Pending quiz",
    href: `/dashboard/quiz/${quiz._id.toString()}`
  }));

  const planResults = plans.map((plan) => ({
    id: plan._id.toString(),
    type: "planner" as const,
    title: plan.name ?? "Study Plan",
    subtitle: `${plan.subjects?.length ?? 0} subjects`,
    href: "/dashboard/plan?tool=planner"
  }));

  const revisionResults = revisions.map((item) => ({
    id: item._id.toString(),
    type: "revision" as const,
    title: `${item.subject}: ${item.topic}`,
    subtitle: `Review due ${new Date(item.nextReviewDate).toLocaleDateString("en-IN")}`,
    href: "/dashboard/revise?tool=revision-queue"
  }));

  const examResults = exams.map((exam) => ({
    id: exam._id.toString(),
    type: "exam" as const,
    title: `${exam.subject}: ${exam.examName}`,
    subtitle: `${new Date(exam.examDate).toLocaleDateString("en-IN")}${exam.board ? ` • ${exam.board}` : ""}`,
    href: "/dashboard/plan?tool=exams"
  }));

  const featureResults = filterSearchShortcuts(q)
    .filter((shortcut) => SEARCH_SHORTCUTS.some((candidate) => candidate.id === shortcut.id))
    .map((shortcut) => ({
      id: shortcut.id,
      type: "feature" as const,
      title: shortcut.title,
      subtitle: shortcut.subtitle,
      href: shortcut.href
    }));

  const results = [...noteResults, ...quizResults, ...planResults, ...revisionResults, ...examResults, ...featureResults].slice(0, 12);

  return NextResponse.json({ results });
}
