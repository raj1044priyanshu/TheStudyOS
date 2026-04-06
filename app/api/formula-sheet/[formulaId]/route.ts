import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildValidationErrorResponse, objectIdRouteParamSchema, requireRateLimitedUser, routeError } from "@/lib/api";
import { FormulaSheetModel } from "@/models/FormulaSheet";

export async function DELETE(request: Request, { params }: { params: { formulaId: string } }) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "formulaMutation",
      key: "formula-delete"
    });
    if (authResult.error) return authResult.error;

    const parsedFormulaId = objectIdRouteParamSchema.safeParse(params.formulaId);
    if (!parsedFormulaId.success) {
      return buildValidationErrorResponse(parsedFormulaId.error);
    }

    await connectToDatabase();
    const result = await FormulaSheetModel.updateOne(
      { userId: authResult.userId, "formulas._id": parsedFormulaId.data },
      { $pull: { formulas: { _id: parsedFormulaId.data } } }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("formula-sheet:delete", error);
  }
}
