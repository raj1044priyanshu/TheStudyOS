import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { UserModel } from "@/models/User";
import { uploadProfileImage } from "@/lib/cloudinary";
import { normalizeTimeZone } from "@/lib/timezone";

const patchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  imageBase64: z.string().min(100).optional(),
  timezone: z.string().min(2).max(100).optional(),
  studyProfile: z
    .object({
      class: z.string().min(2).optional(),
      board: z.string().min(2).optional(),
      stream: z.enum(["Science", "Commerce", "Humanities", "Other"]).optional(),
      studyHoursPerDay: z.number().min(1).max(16).optional()
    })
    .optional()
});

function toProfilePayload(user: {
  _id: { toString: () => string };
  name: string;
  email: string;
  image?: string | null;
  timezone?: string | null;
  createdAt?: Date;
  studyProfile?: {
    class?: string | null;
    board?: string | null;
    stream?: string | null;
    studyHoursPerDay?: number | null;
  } | null;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    timezone: normalizeTimeZone(user.timezone),
    studyProfile: {
      class: user.studyProfile?.class ?? "",
      board: user.studyProfile?.board ?? "",
      stream: user.studyProfile?.stream ?? "",
      studyHoursPerDay: user.studyProfile?.studyHoursPerDay ?? 0
    },
    createdAt: user.createdAt?.toISOString() ?? null
  };
}

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`profile:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  const user = await UserModel.findById(authResult.userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: toProfilePayload(user) });
}

export async function PATCH(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`profile:${authResult.userId}`);
  if (rate) return rate;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, imageBase64, timezone, studyProfile } = parsed.data;

  if (!name && !imageBase64 && !timezone && !studyProfile) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await UserModel.findById(authResult.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (name) {
    user.name = name.trim();
  }

  if (timezone) {
    user.timezone = normalizeTimeZone(timezone);
  }

  if (studyProfile) {
    user.studyProfile = {
      ...user.studyProfile,
      ...(studyProfile.class ? { class: studyProfile.class.trim() } : {}),
      ...(studyProfile.board ? { board: studyProfile.board.trim() } : {}),
      ...(studyProfile.stream ? { stream: studyProfile.stream } : {}),
      ...(typeof studyProfile.studyHoursPerDay === "number" ? { studyHoursPerDay: studyProfile.studyHoursPerDay } : {})
    };
  }

  if (imageBase64) {
    // Prevent overly large payload uploads from crashing the request.
    if (imageBase64.length > 8_000_000) {
      return NextResponse.json({ error: "Image is too large" }, { status: 413 });
    }
    const uploaded = await uploadProfileImage(imageBase64);
    user.image = uploaded.secure_url;
  }

  await user.save();

  return NextResponse.json({ success: true, profile: toProfilePayload(user.toObject()) });
}
