import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { FormulaSheetModel } from "@/models/FormulaSheet";

export async function DELETE(_request: Request, { params }: { params: { formulaId: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const result = await FormulaSheetModel.updateOne(
      { userId: authResult.userId, "formulas._id": params.formulaId },
      { $pull: { formulas: { _id: params.formulaId } } }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("formula-sheet:delete", error);
  }
}
