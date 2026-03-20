import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { UserModel } from "@/models/User";

export async function PATCH() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`streak-alert:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  await UserModel.updateOne(
    { _id: authResult.userId },
    {
      $set: {
        streakBreakPending: false
      }
    }
  );

  return NextResponse.json({ success: true });
}
