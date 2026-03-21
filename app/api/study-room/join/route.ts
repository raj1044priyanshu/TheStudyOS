import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { isPusherConfigured, pusherServer } from "@/lib/pusher";
import type { StudyRoomMember } from "@/types";

const schema = z.object({
  roomCode: z.string().min(6).max(6)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const room = await StudyRoomModel.findOne({
      roomCode: parsed.data.roomCode.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (
      room.members.length >= 5 &&
      !room.members.some((member: StudyRoomMember) => member.userId.toString() === authResult.userId)
    ) {
      return NextResponse.json({ error: "Room is full" }, { status: 403 });
    }

    if (!room.members.some((member: StudyRoomMember) => member.userId.toString() === authResult.userId)) {
      room.members.push({
        userId: authResult.userId as never,
        name: authResult.session.user?.name ?? "Student",
        avatar: authResult.session.user?.image ?? "",
        joinedAt: new Date()
      });
      await room.save();
    }

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "member-joined", {
        userId: authResult.userId,
        name: authResult.session.user?.name ?? "Student",
        avatar: authResult.session.user?.image ?? "",
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ room, realtimeReady: isPusherConfigured() });
  } catch (error) {
    return routeError("study-room:join", error);
  }
}
