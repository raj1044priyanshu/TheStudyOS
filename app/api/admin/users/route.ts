export const dynamic = "force-dynamic";

import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { UserModel } from "@/models/User";

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const role = searchParams.get("role")?.trim() ?? "";

    const filter: Record<string, unknown> = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (status) {
      filter.status = status;
    }
    if (role) {
      filter.role = role;
    }

    const users = await UserModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .select(
        "name email image role status lastActive totalNotesGenerated totalQuizzesTaken totalXP createdAt updatedAt streak"
      )
      .lean();

    return Response.json({ users: toSerializable(users) });
  } catch (error) {
    return routeError("admin:users:list", error);
  }
}
