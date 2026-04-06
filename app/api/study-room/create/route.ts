import { addHours } from "date-fns";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireRateLimitedUser, routeError } from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { createRoomCode } from "@/lib/study-room";
import { isPusherConfigured } from "@/lib/pusher";
import { markFeatureUsed } from "@/lib/progress";

export async function POST(request: Request) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "studyRoomJoin",
      key: "study-room-create"
    });
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    let roomCode = createRoomCode();
    // Keep room code collisions extremely unlikely.
    while (await StudyRoomModel.exists({ roomCode })) {
      roomCode = createRoomCode();
    }

    const room = await StudyRoomModel.create({
      roomCode,
      hostUserId: authResult.userId,
      members: [
        {
          userId: authResult.userId,
          name: authResult.session.user?.name ?? "Student",
          avatar: authResult.session.user?.image ?? "",
          joinedAt: new Date()
        }
      ],
      subject: "General",
      isActive: true,
      timerDuration: 25,
      timerPaused: true,
      expiresAt: addHours(new Date(), 4)
    });

    await markFeatureUsed(authResult.userId, "study-room");

    return NextResponse.json({
      roomCode: room.roomCode,
      roomId: room._id.toString(),
      realtimeReady: isPusherConfigured()
    });
  } catch (error) {
    return routeError("study-room:create", error);
  }
}
