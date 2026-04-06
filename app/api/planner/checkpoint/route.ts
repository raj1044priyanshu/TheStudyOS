import { Types } from "mongoose";
import { z } from "zod";
import { NextResponse } from "next/server";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { logActivity } from "@/lib/progress";
import { createOrGetPlannerCheckpoint, evaluatePlannerCheckpointAttempt } from "@/lib/planner-assessment";
import { PlannerCheckpointModel } from "@/models/PlannerCheckpoint";
import { StudyPlanModel } from "@/models/StudyPlan";

const createSchema = z.object({
  planId: z.string(),
  date: z.string(),
  taskIndex: z.number().int().min(0),
  board: z.string().optional(),
  className: z.string().optional(),
  stream: z.string().optional()
});

const submitSchema = z.object({
  checkpointId: z.string(),
  answers: z.array(z.string().default("")),
  subject: z.string().min(2)
});

function plannerSummary(plan: {
  _id: Types.ObjectId;
  name?: string;
  createdAt?: Date;
  startDate?: Date;
  examDate?: Date;
  hoursPerDay?: number;
  subjects: { name: string; hoursPerDay: number; priority: number }[];
  exams?: unknown[];
  studyContext?: unknown;
  generatedPlan: Array<{ tasks: Array<{ completed?: boolean }> }>;
}) {
  const totalTasks = plan.generatedPlan.reduce((sum, day) => sum + day.tasks.length, 0);
  const completedTasks = plan.generatedPlan.reduce(
    (sum, day) => sum + day.tasks.filter((task) => Boolean(task.completed)).length,
    0
  );

  return {
    _id: plan._id.toString(),
    name: plan.name ?? "Study Plan",
    createdAt: plan.createdAt?.toISOString() ?? new Date().toISOString(),
    startDate: plan.startDate?.toISOString() ?? null,
    examDate: plan.examDate?.toISOString() ?? null,
    hoursPerDay: plan.hoursPerDay ?? 1,
    subjects: plan.subjects,
    exams: plan.exams ?? [],
    studyContext: plan.studyContext ?? null,
    totalDays: plan.generatedPlan.length,
    totalTasks,
    completedTasks,
    completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  };
}

function plannerDetails(plan: Parameters<typeof plannerSummary>[0]) {
  return {
    ...plannerSummary(plan),
    generatedPlan: plan.generatedPlan
  };
}

function serializeCheckpoint(checkpoint: {
  _id: Types.ObjectId | string;
  planId: Types.ObjectId | string;
  date: string;
  taskIndex: number;
  subject: string;
  chapter: string;
  coverageOutline?: string[];
  questions?: Array<{
    prompt: string;
    concept: string;
    difficulty: "easy" | "medium" | "hard";
    type: "objective" | "fill_blank" | "short" | "long" | "numerical" | "case";
    options?: string[];
    answerKey?: string;
    rubric?: string;
    maxMarks: number;
  }>;
  score?: number;
  passed?: boolean;
  status?: "generated" | "submitted";
  feedback?: string[];
  obtainedMarks?: number;
  totalMarks?: number;
  latestAttemptAt?: Date | string | null;
  questionResults?: Array<{
    questionIndex: number;
    obtainedMarks: number;
    maxMarks: number;
    feedback: string;
    recommendedAction?: string;
    concept?: string;
    questionType?: string;
    difficulty?: string;
  }>;
  attempts?: Array<{
    submittedAt: Date | string;
    answers: string[];
    score: number;
    passed: boolean;
    obtainedMarks: number;
    totalMarks: number;
    feedback: string[];
    questionResults: Array<{
      questionIndex: number;
      obtainedMarks: number;
      maxMarks: number;
      feedback: string;
      recommendedAction?: string;
      concept?: string;
      questionType?: string;
      difficulty?: string;
    }>;
  }>;
}) {
  return {
    _id: checkpoint._id.toString(),
    planId: checkpoint.planId.toString(),
    date: checkpoint.date,
    taskIndex: checkpoint.taskIndex,
    subject: checkpoint.subject,
    chapter: checkpoint.chapter,
    coverageOutline: checkpoint.coverageOutline ?? [],
    questions: checkpoint.questions ?? [],
    score: checkpoint.score ?? 0,
    passed: Boolean(checkpoint.passed),
    status: checkpoint.status ?? "generated",
    feedback: checkpoint.feedback ?? [],
    obtainedMarks: checkpoint.obtainedMarks ?? 0,
    totalMarks: checkpoint.totalMarks ?? 0,
    latestAttemptAt: checkpoint.latestAttemptAt ? new Date(checkpoint.latestAttemptAt).toISOString() : null,
    questionResults: (checkpoint.questionResults ?? []).map((result) => ({
      ...result
    })),
    attempts: (checkpoint.attempts ?? []).map((attempt) => ({
      ...attempt,
      submittedAt: new Date(attempt.submittedAt).toISOString(),
      questionResults: (attempt.questionResults ?? []).map((result) => ({
        ...result
      }))
    }))
  };
}

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`planner-checkpoint:create:${authResult.userId}`);
    if (rate) return rate;

    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const plan = await StudyPlanModel.findOne({ _id: parsed.data.planId, userId: authResult.userId });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const day = plan.generatedPlan.find((item: { date: string }) => item.date === parsed.data.date);
    const task = day?.tasks?.[parsed.data.taskIndex];
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const examContext = Array.isArray(plan.exams)
      ? plan.exams.find((exam: { examId?: string | null; examName?: string; subject?: string }) =>
          (task.examId && exam.examId === task.examId) || exam.examName === task.examName || exam.subject === task.subject
        )
      : null;

    const checkpoint = await createOrGetPlannerCheckpoint({
      userId: authResult.userId,
      planId: plan._id.toString(),
      date: parsed.data.date,
      taskIndex: parsed.data.taskIndex,
      subject: task.subject,
      chapter: task.chapter ?? task.topic,
      examName: task.examName ?? examContext?.examName ?? "",
      board: parsed.data.board ?? (plan.studyContext as { board?: string } | null)?.board ?? "",
      className: parsed.data.className ?? (plan.studyContext as { className?: string } | null)?.className ?? "",
      stream: parsed.data.stream ?? (plan.studyContext as { stream?: string } | null)?.stream ?? ""
    });

    task.checkpointStatus = checkpoint.passed ? "passed" : "checkpoint_required";
    task.checkpointId = checkpoint._id.toString();
    task.checkpointScore = checkpoint.score;
    await plan.save();

    return NextResponse.json({ checkpoint: serializeCheckpoint(checkpoint.toObject()) });
  } catch (error) {
    return routeError("planner-checkpoint:create", error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`planner-checkpoint:submit:${authResult.userId}`);
    if (rate) return rate;

    const parsed = submitSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const checkpoint = await PlannerCheckpointModel.findOne({
      _id: parsed.data.checkpointId,
      userId: authResult.userId
    });

    if (!checkpoint) {
      return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
    }

    await evaluatePlannerCheckpointAttempt(checkpoint as never, parsed.data.answers);

    const plan = await StudyPlanModel.findOne({ _id: checkpoint.planId, userId: authResult.userId });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const day = plan.generatedPlan.find((item: { date: string }) => item.date === checkpoint.date);
    const task = day?.tasks?.[checkpoint.taskIndex];
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    task.checkpointId = checkpoint._id.toString();
    task.checkpointScore = checkpoint.score;
    task.checkpointStatus = checkpoint.passed ? "passed" : "revise_again";
    task.completed = checkpoint.passed;
    await plan.save();

    let events = null;
    if (checkpoint.passed) {
      events = await logActivity({
        userId: authResult.userId,
        subject: parsed.data.subject,
        type: "quiz",
        quizScore: checkpoint.score,
        minutesStudied: 20
      });
    }

    const planDoc = plan.toObject() as Parameters<typeof plannerDetails>[0];

    return NextResponse.json({
      checkpoint: serializeCheckpoint(checkpoint.toObject()),
      selectedPlan: plannerDetails(planDoc),
      summary: plannerSummary(planDoc),
      events
    });
  } catch (error) {
    return routeError("planner-checkpoint:submit", error);
  }
}
