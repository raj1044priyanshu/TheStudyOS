import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { FormulaSheetModel } from "@/models/FormulaSheet";

export async function GET(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const url = new URL(request.url);
    const subject = url.searchParams.get("subject")?.trim() ?? "all";

    await connectToDatabase();
    if (subject === "all") {
      const sheets = await FormulaSheetModel.find({ userId: authResult.userId }).sort({ subject: 1 }).lean();
      return NextResponse.json({ sheets });
    }

    const sheet = await FormulaSheetModel.findOne({ userId: authResult.userId, subject }).lean();
    return NextResponse.json({ sheet });
  } catch (error) {
    return routeError("formula-sheet:get", error);
  }
}
