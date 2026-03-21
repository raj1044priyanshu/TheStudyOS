import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { StudyPlanModel } from "@/models/StudyPlan";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`search:${authResult.userId}`);
  if (rate) return rate;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  await connectToDatabase();
  const regex = new RegExp(escapeRegex(q), "i");
  const startsWithRegex = new RegExp(`^${escapeRegex(q)}`, "i");

  const [notes, quizzes, plans] = await Promise.all([
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

  const featureResults = [
    { id: "notes", type: "feature" as const, title: "Open Notes", subtitle: "Generate topper-style notes", href: "/dashboard/study?tool=notes" },
    { id: "quiz", type: "feature" as const, title: "Open Quiz", subtitle: "Practice MCQs and track scores", href: "/dashboard/test?tool=quiz" },
    { id: "planner", type: "feature" as const, title: "Open Planner", subtitle: "Schedule your daily tasks", href: "/dashboard/plan?tool=planner" },
    { id: "progress", type: "feature" as const, title: "Open Track", subtitle: "Review streak and achievements", href: "/dashboard/track" }
  ].filter((item) => item.title.toLowerCase().includes(q.toLowerCase()) || item.subtitle.toLowerCase().includes(q.toLowerCase()));

  const results = [...noteResults, ...quizResults, ...planResults, ...featureResults].slice(0, 10);

  return NextResponse.json({ results });
}
