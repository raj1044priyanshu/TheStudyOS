import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { ExamModel } from "@/models/Exam";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const result = await ExamModel.deleteOne({ _id: params.id, userId: authResult.userId });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("exams:delete", error);
  }
}
