import { z } from "zod";
import { NextResponse } from "next/server";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { ExamModel } from "@/models/Exam";
import { UserModel } from "@/models/User";
import { buildAutoPlannerExams, enrichCbseExams } from "@/lib/planner-prefill";
import { normalizeTopicList, toDateInput } from "@/lib/planner-utils";

const explicitExamSchema = z.object({
  className: z.string().min(2),
  board: z.string().min(2),
  stream: z.enum(["Science", "Commerce", "Humanities", "Other"]).optional().or(z.literal("")),
  examIds: z.array(z.string()).min(1)
});

const autoExamSchema = z.object({
  className: z.string().min(2),
  board: z.string().min(2),
  stream: z.enum(["Science", "Commerce", "Humanities", "Other"]).optional().or(z.literal("")),
  examYear: z.number().int().min(2000).max(2100)
});

const schema = z.union([explicitExamSchema, autoExamSchema]);

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`planner-prefill:extract:${authResult.userId}`);
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();

    if ("examYear" in parsed.data) {
      const user = await UserModel.findById(authResult.userId).select("studyProfile.subjects").lean();
      const profileSubjects = Array.isArray(user?.studyProfile?.subjects) ? user.studyProfile.subjects : [];
      const generated = await buildAutoPlannerExams({
        className: parsed.data.className,
        board: parsed.data.board,
        stream: parsed.data.stream,
        examYear: parsed.data.examYear,
        profileSubjects
      });

      if (!generated.confirmedExams.length) {
        return NextResponse.json({ error: generated.notes[0] ?? "No subjects were available for this planner flow." }, { status: 400 });
      }

      return NextResponse.json({
        confirmedExams: generated.confirmedExams,
        notes: generated.notes
      });
    }

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
      const derivedExamYear =
        exams
          .map((exam) => new Date(exam.examDate).getFullYear())
          .find((year) => Number.isFinite(year) && year >= 2000 && year <= 2100) ?? new Date().getFullYear();
      const enriched = await enrichCbseExams({
        className: parsed.data.className,
        examYear: derivedExamYear,
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
    return routeError("planner-prefill:extract", error);
  }
}
