import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function PATCH() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`onboarding:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  await UserModel.updateOne(
    { _id: authResult.userId },
    {
      $set: {
        onboardingCompleted: true,
        welcomeScreenSeen: true,
        isTourShown: true
      }
    }
  );

  return NextResponse.json({ success: true, onboardingCompleted: true, welcomeScreenSeen: true });
}
