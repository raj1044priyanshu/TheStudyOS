import { NextResponse } from "next/server";
import { objectIdRouteParamSchema, requireUser } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { PlannerCheckpointModel } from "@/models/PlannerCheckpoint";

function serializeCheckpoint(checkpoint: {
  _id: { toString: () => string };
  planId: { toString: () => string };
  date: string;
  taskIndex: number;
  subject: string;
  chapter: string;
  coverageOutline?: string[];
  questions?: unknown[];
  score?: number;
  passed?: boolean;
  status?: string;
  feedback?: string[];
  obtainedMarks?: number;
  totalMarks?: number;
  latestAttemptAt?: Date | string | null;
  questionResults?: unknown[];
  attempts?: Array<{ submittedAt: Date | string } & Record<string, unknown>>;
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
    questionResults: checkpoint.questionResults ?? [],
    attempts: (checkpoint.attempts ?? []).map((attempt) => ({
      ...attempt,
      submittedAt: new Date(attempt.submittedAt).toISOString()
    }))
  };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const parsedId = objectIdRouteParamSchema.safeParse(params.id);
  if (!parsedId.success) {
    return NextResponse.json({ error: parsedId.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();
  const checkpoint = await PlannerCheckpointModel.findOne({
    _id: parsedId.data,
    userId: authResult.userId
  }).lean();

  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
  }

  return NextResponse.json({ checkpoint: serializeCheckpoint(checkpoint as never) });
}
