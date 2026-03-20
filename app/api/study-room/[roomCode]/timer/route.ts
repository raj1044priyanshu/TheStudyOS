import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { pusherServer } from "@/lib/pusher";

const schema = z.object({
  action: z.enum(["start", "pause", "reset"]),
  duration: z.number().min(1).max(180).optional()
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
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (room.hostUserId.toString() !== authResult.userId) {
      return NextResponse.json({ error: "Only the host can control the timer" }, { status: 403 });
    }

    if (parsed.data.action === "start") {
      room.timerDuration = parsed.data.duration ?? room.timerDuration;
      room.timerStartedAt = new Date();
      room.timerPaused = false;
    } else if (parsed.data.action === "pause") {
      room.timerPaused = true;
    } else {
      room.timerPaused = true;
      room.timerStartedAt = null;
      if (parsed.data.duration) room.timerDuration = parsed.data.duration;
    }

    await room.save();

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "timer-update", {
        timerDuration: room.timerDuration,
        timerStartedAt: room.timerStartedAt,
        timerPaused: room.timerPaused
      });
    }

    return NextResponse.json({ room });
  } catch (error) {
    return routeError("study-room:timer", error);
  }
}
