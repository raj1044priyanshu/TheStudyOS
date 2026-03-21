import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

const schema = z.object({
  step: z.number().int().min(0).max(6),
  data: z
    .object({
      class: z.string().optional(),
      board: z.string().optional(),
      stream: z.enum(["Science", "Commerce", "Humanities", "Other"]).optional(),
      subjects: z.array(z.string()).optional(),
      examGoal: z.string().optional(),
      studyHoursPerDay: z.number().min(0).max(12).optional(),
      weakAreas: z.array(z.string()).optional(),
      studyStyle: z.enum(["visual", "reading", "practice", "mixed"]).optional()
    })
    .default({})
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`onboarding:save-step:${authResult.userId}`);
    if (rate) return rate;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const setPayload: Record<string, string | number | string[]> = {
      onboardingStep: parsed.data.step
    };

    for (const [key, value] of Object.entries(parsed.data.data)) {
      if (value !== undefined) {
        setPayload[`studyProfile.${key}`] = value;
      }
    }

    await UserModel.updateOne({ _id: authResult.userId }, { $set: setPayload });

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("onboarding:save-step", error);
  }
}
