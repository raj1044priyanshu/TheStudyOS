import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`onboarding:complete:${authResult.userId}`);
    if (rate) return rate;

    await connectToDatabase();
    await UserModel.updateOne(
      { _id: authResult.userId },
      {
        $set: {
          onboardingCompleted: true,
          onboardingStep: 6,
          welcomeScreenSeen: true,
          isTourShown: true
        }
      }
    );

    return NextResponse.json({ redirectTo: "/dashboard" });
  } catch (error) {
    return routeError("onboarding:complete", error);
  }
}
