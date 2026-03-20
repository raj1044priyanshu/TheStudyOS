import { NextResponse } from "next/server";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { AchievementModel } from "@/models/Achievement";
import { UserModel } from "@/models/User";

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`achievements:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();

  const [achievements, user] = await Promise.all([
    AchievementModel.find({ userId: authResult.userId }).sort({ unlockedAt: -1 }).lean(),
    UserModel.findById(authResult.userId).select("xp level").lean()
  ]);

  return NextResponse.json({
    achievements,
    progress: {
      currentXp: user?.xp ?? 0,
      currentLevel: user?.level ?? 1,
      nextLevelXp: Math.pow((user?.level ?? 1), 2) * 100
    }
  });
}
