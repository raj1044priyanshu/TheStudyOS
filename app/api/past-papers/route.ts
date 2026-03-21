export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { PastPaperModel } from "@/models/PastPaper";

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const papers = await PastPaperModel.find({ userId: authResult.userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ papers });
  } catch (error) {
    return routeError("past-papers:list", error);
  }
}
