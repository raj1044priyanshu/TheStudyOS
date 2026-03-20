import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { pusherServer } from "@/lib/pusher";
import type { StudyRoomMember } from "@/types";

const schema = z.object({
  content: z.string().min(1).max(1000)
});

export async function POST(request: Request, { params }: { params: { roomCode: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const room = await StudyRoomModel.findOne({ roomCode: params.roomCode.toUpperCase(), isActive: true });
    if (!room || !room.members.some((member: StudyRoomMember) => member.userId.toString() === authResult.userId)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "new-message", {
        userId: authResult.userId,
        name: authResult.session.user?.name ?? "Student",
        avatar: authResult.session.user?.image ?? "",
        content: parsed.data.content,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("study-room:message", error);
  }
}
