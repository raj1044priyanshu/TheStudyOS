import { Types } from "mongoose";
import { z } from "zod";
import { NextResponse } from "next/server";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { generateJsonWithFallback } from "@/lib/ai";
import { logActivity } from "@/lib/progress";
import { StudyPlanModel } from "@/models/StudyPlan";
import { PlannerCheckpointModel } from "@/models/PlannerCheckpoint";

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
    const existing = await PlannerCheckpointModel.findOne({
      userId: authResult.userId,
      planId: parsed.data.planId,
      date: parsed.data.date,
      taskIndex: parsed.data.taskIndex
    }).lean();

    if (existing) {
      return NextResponse.json({ checkpoint: existing });
    }

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

    const generated = await generateJsonWithFallback<{
      questions: Array<{
        prompt: string;
        type: "objective" | "fill_blank" | "short" | "long" | "numerical";
        options?: string[];
        answerKey?: string;
        rubric?: string;
        maxMarks: number;
      }>;
    }>({
      systemPrompt: "You create accurate chapter checkpoint tests for school students. Return valid JSON only.",
      prompt: `Create a mixed-format checkpoint test for this study task.

Subject: ${task.subject}
Chapter: ${task.chapter ?? task.topic}
Exam: ${task.examName ?? examContext?.examName ?? "Upcoming exam"}
Board: ${parsed.data.board ?? (plan.studyContext as { board?: string } | null)?.board ?? "CBSE"}
Class: ${parsed.data.className ?? (plan.studyContext as { className?: string } | null)?.className ?? ""}
Stream: ${parsed.data.stream ?? (plan.studyContext as { stream?: string } | null)?.stream ?? ""}

Return ONLY this exact JSON format:
{
  "questions": [
    {
      "prompt": "",
      "type": "objective",
      "options": ["", "", "", ""],
      "answerKey": "",
      "rubric": "",
      "maxMarks": 2
    }
  ]
}

Rules:
- Create exactly 5 questions.
- Include at least 1 objective, 1 fill_blank, 1 short, and 1 long or numerical question.
- Keep the final total marks between 10 and 14.
- For objective questions, include exactly 4 options and set answerKey to the correct option text.
- For fill_blank questions, set answerKey to the exact expected answer.
- For short/long/numerical questions, include a concise rubric the evaluator can score against.`
    });

    const checkpoint = await PlannerCheckpointModel.create({
      userId: authResult.userId,
      planId: plan._id,
      date: parsed.data.date,
      taskIndex: parsed.data.taskIndex,
      subject: task.subject,
      chapter: task.chapter ?? task.topic,
      examName: task.examName ?? examContext?.examName ?? "",
      board: parsed.data.board ?? (plan.studyContext as { board?: string } | null)?.board ?? "",
      className: parsed.data.className ?? (plan.studyContext as { className?: string } | null)?.className ?? "",
      stream: parsed.data.stream ?? (plan.studyContext as { stream?: string } | null)?.stream ?? "",
      questions: (generated.data.questions ?? []).slice(0, 5)
    });

    task.checkpointStatus = "checkpoint_required";
    task.checkpointId = checkpoint._id.toString();
    await plan.save();

    return NextResponse.json({ checkpoint });
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

    const evaluation = await generateJsonWithFallback<{
      questionResults: Array<{
        questionIndex: number;
        obtainedMarks: number;
        maxMarks: number;
        feedback: string;
      }>;
      feedback: string[];
      totalScore: number;
      passed: boolean;
    }>({
      systemPrompt: "You are a strict but fair chapter-checkpoint evaluator. Grade exactly against the provided answer keys and rubrics.",
      prompt: `Evaluate this checkpoint submission.

Subject: ${checkpoint.subject}
Chapter: ${checkpoint.chapter}

Questions:
${JSON.stringify(checkpoint.questions)}

Student answers:
${JSON.stringify(parsed.data.answers)}

Return ONLY this exact JSON format:
{
  "questionResults": [
    {
      "questionIndex": 0,
      "obtainedMarks": 0,
      "maxMarks": 2,
      "feedback": ""
    }
  ],
  "feedback": ["", ""],
  "totalScore": 0,
  "passed": false
}

Rules:
- Objective and fill_blank questions must match the intended answer closely.
- Long, short, and numerical answers should be graded using the rubric.
- The student passes only if totalScore is 50 or above out of 100.`
    });

    checkpoint.status = "submitted";
    checkpoint.score = Math.max(0, Math.min(100, Math.round(evaluation.data.totalScore ?? 0)));
    checkpoint.passed = Boolean(evaluation.data.passed ?? checkpoint.score >= 50);
    checkpoint.feedback = (evaluation.data.feedback ?? []).slice(0, 6);
    checkpoint.questionResults = (evaluation.data.questionResults ?? []).map((result) => ({
      questionIndex: result.questionIndex,
      obtainedMarks: result.obtainedMarks,
      maxMarks: result.maxMarks,
      feedback: result.feedback
    }));
    await checkpoint.save();

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
      checkpoint,
      selectedPlan: plannerDetails(planDoc),
      summary: plannerSummary(planDoc),
      events
    });
  } catch (error) {
    return routeError("planner-checkpoint:submit", error);
  }
}
