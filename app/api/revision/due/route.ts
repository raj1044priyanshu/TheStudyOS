import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { getDueRevisionItems, getUpcomingRevisionItems } from "@/lib/revision";

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const [due, upcoming] = await Promise.all([
      getDueRevisionItems(authResult.userId),
      getUpcomingRevisionItems(authResult.userId)
    ]);

    return NextResponse.json({ due, upcoming });
  } catch (error) {
    return routeError("revision-due", error);
  }
}
