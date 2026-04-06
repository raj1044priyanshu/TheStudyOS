import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildValidationErrorResponse, objectIdRouteParamSchema, requireRateLimitedUser, routeError } from "@/lib/api";
import { ExamModel } from "@/models/Exam";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "examMutation",
      key: "exam-delete"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    await connectToDatabase();
    const result = await ExamModel.deleteOne({ _id: parsedId.data, userId: authResult.userId });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("exams:delete", error);
  }
}
