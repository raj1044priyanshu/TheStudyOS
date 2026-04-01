import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, applyRouteRateLimit, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { AchievementModel } from "@/models/Achievement";
import { UserModel } from "@/models/User";
import { ACHIEVEMENTS, awardDailyLogin, markFeatureUsed, runAchievementChecks } from "@/lib/progress";
import { getLevelFromXp, getNextLevel, getProgressToNextLevel } from "@/lib/xp";

const triggerSchema = z.object({
  trigger: z.string().min(1)
});

const triggerToFeature: Record<string, string> = {
  note_generated: "notes",
  quiz_completed: "quiz",
  quiz_perfect: "quiz",
  focus_completed: "focus",
  teachme_completed: "teach-me",
  scan_completed: "scanner",
  evaluation_completed: "evaluator",
  revision_reviewed: "revision",
  pastpaper_uploaded: "past-papers",
  room_hosted: "study-room",
  formula_added: "formula-sheet",
  exam_added: "exams",
  simplify_used: "simplify",
  graph_viewed: "knowledge-graph",
  flashcards_used: "flashcards",
  doubts_used: "doubts",
  planner_used: "planner"
};

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`achievements:${authResult.userId}`, "achievements");
    if (rate) return rate;

    await connectToDatabase();

    const [achievements, user] = await Promise.all([
      AchievementModel.find({ userId: authResult.userId }).sort({ unlockedAt: -1 }).lean(),
      UserModel.findById(authResult.userId).select("totalXP xp").lean()
    ]);

    const totalXP = user?.totalXP ?? user?.xp ?? 0;
    const level = getLevelFromXp(totalXP);
    const nextLevel = getNextLevel(totalXP);

    return NextResponse.json({
      unlockedAchievementIds: achievements.map((item) => item.achievementId ?? item.type),
      achievements,
      definitions: Object.values(ACHIEVEMENTS),
      progress: {
        currentXp: totalXP,
        currentLevel: level.level,
        nextLevelXp: nextLevel?.minXp ?? null,
        levelName: level.name,
        levelIcon: level.icon,
        progressToNextLevel: getProgressToNextLevel(totalXP)
      }
    });
  } catch (error) {
    return routeError("achievements:get", error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`achievements:${authResult.userId}`, "achievements");
    if (rate) return rate;

    const parsed = triggerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const beforeUser = await UserModel.findById(authResult.userId).select("totalXP xp").lean();
    const beforeTotalXP = beforeUser?.totalXP ?? beforeUser?.xp ?? 0;
    const beforeLevel = getLevelFromXp(beforeTotalXP);

    if (parsed.data.trigger === "daily_login") {
      await awardDailyLogin(authResult.userId);
    }

    const feature = triggerToFeature[parsed.data.trigger];
    if (feature) {
      await markFeatureUsed(authResult.userId, feature);
    }

    const result = await runAchievementChecks(authResult.userId);

    return NextResponse.json({
      newAchievements: result.newAchievements,
      totalXP: result.totalXP,
      level: result.level.level,
      levelName: result.level.name,
      levelIcon: result.level.icon,
      previousLevel: beforeLevel.level,
      xpGained: Math.max(0, (result.totalXP ?? beforeTotalXP) - beforeTotalXP),
      levelUp: {
        happened: result.level.level > beforeLevel.level,
        from: beforeLevel.level,
        to: result.level.level,
        name: result.level.name
      }
    });
  } catch (error) {
    return routeError("achievements:post", error);
  }
}
