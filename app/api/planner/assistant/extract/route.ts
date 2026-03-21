import { z } from "zod";
import { NextResponse } from "next/server";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { ExamModel } from "@/models/Exam";
import { enrichCbseExams } from "@/lib/planner-assistant";
import { normalizeTopicList, toDateInput } from "@/lib/planner-utils";

const schema = z.object({
  className: z.string().min(2),
  board: z.string().min(2),
  stream: z.enum(["Science", "Commerce", "Humanities", "Other"]).optional(),
  examIds: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`planner-assistant:extract:${authResult.userId}`);
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const exams = await ExamModel.find({
      userId: authResult.userId,
      _id: { $in: parsed.data.examIds }
    })
      .sort({ examDate: 1 })
      .lean();

    if (!exams.length) {
      return NextResponse.json({ error: "No matching exams found" }, { status: 404 });
    }

    if (parsed.data.board.trim().toUpperCase() === "CBSE") {
      const enriched = await enrichCbseExams({
        className: parsed.data.className,
        exams: exams.map((exam) => ({
          _id: exam._id.toString(),
          subject: exam.subject,
          examName: exam.examName,
          examDate: toDateInput(exam.examDate),
          board: exam.board ?? "CBSE",
          syllabus: normalizeTopicList(exam.syllabus ?? [])
        }))
      });

      return NextResponse.json({
        confirmedExams: enriched.confirmedExams,
        notes: enriched.notes
      });
    }

    return NextResponse.json({
      confirmedExams: exams.map((exam) => ({
        examId: exam._id.toString(),
        subject: exam.subject,
        examName: exam.examName,
        examDate: toDateInput(exam.examDate),
        board: exam.board ?? parsed.data.board,
        chapters: normalizeTopicList(exam.syllabus ?? []),
        source: (exam.syllabus?.length ?? 0) > 0 ? "saved" : "manual",
        notes: (exam.syllabus?.length ?? 0) > 0 ? undefined : "Add chapters manually for this exam before generating the plan."
      })),
      notes: ["Unsupported boards stay fully editable. Add or confirm chapters manually before generating the plan."]
    });
  } catch (error) {
    return routeError("planner-assistant:extract", error);
  }
}
