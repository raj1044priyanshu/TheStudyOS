import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser } from "@/lib/api";
import { QuizModel } from "@/models/Quiz";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  await connectToDatabase();
  const quiz = await QuizModel.findOne({ _id: params.id, userId: authResult.userId }).lean();
  if (!quiz) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ quiz });
}
