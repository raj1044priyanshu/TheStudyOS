import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { UserModel } from "@/models/User";

export async function PATCH(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`tour:${authResult.userId}`);
  if (rate) return rate;

  const body = (await request.json().catch(() => ({}))) as { action?: "complete" | "reset" };
  const action = body.action === "reset" ? "reset" : "complete";

  await connectToDatabase();
  await UserModel.updateOne(
    { _id: authResult.userId },
    {
      $set: {
        isTourShown: action === "complete",
        onboardingCompleted: action === "complete"
      }
    }
  );

  return NextResponse.json({ success: true, action });
}
