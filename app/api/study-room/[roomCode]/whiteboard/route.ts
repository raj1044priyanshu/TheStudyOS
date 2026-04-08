import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import {
  applyRouteRateLimit,
  buildForbiddenResponse,
  buildValidationErrorResponse,
  createUserRateLimitKey,
  requireUser,
  routeError,
  roomCodeRouteParamSchema
} from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { pusherServer } from "@/lib/pusher";
import type { StudyRoomMember } from "@/types";

const schema = z.object({
  strokeId: z.string().min(1),
  phase: z.enum(["segment", "final"]).default("final"),
  color: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/).default("#7B6CF6"),
  width: z.number().min(1).max(12).default(3),
  points: z
    .array(
      z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1)
      })
    )
    .min(1)
    .max(2048)
}).superRefine((payload, context) => {
  if (payload.phase === "final" && payload.points.length < 2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A final stroke must include at least two points.",
      path: ["points"]
    });
  }
});

export async function POST(request: Request, { params }: { params: { roomCode: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const parsedRoomCode = roomCodeRouteParamSchema.safeParse(params.roomCode);
    if (!parsedRoomCode.success) {
      return buildValidationErrorResponse(parsedRoomCode.error);
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error);
    }

    const rate = await applyRouteRateLimit(
      createUserRateLimitKey(
        parsed.data.phase === "segment" ? "study-room-whiteboard-segment" : "study-room-whiteboard-final",
        authResult.userId,
        request
      ),
      parsed.data.phase === "segment" ? "studyRoomWhiteboardSegment" : "studyRoomWhiteboardFinal"
    );
    if (rate) return rate;

    await connectToDatabase();
    const room = await StudyRoomModel.findOne({ roomCode: parsedRoomCode.data, isActive: true });
    if (!room || !room.members.some((member: StudyRoomMember) => member.userId.toString() === authResult.userId)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const existingStrokes = Array.isArray(room.whiteboardStrokes) ? room.whiteboardStrokes : [];
    const alreadySaved = existingStrokes.some((stroke: { strokeId?: string }) => stroke.strokeId === parsed.data.strokeId);

    const stroke = {
      strokeId: parsed.data.strokeId,
      authorUserId: authResult.userId as never,
      color: parsed.data.color,
      width: parsed.data.width,
      points: parsed.data.points,
      createdAt: new Date()
    };

    if (parsed.data.phase === "segment") {
      if (pusherServer) {
        await pusherServer.trigger(`presence-room-${room.roomCode}`, "whiteboard-segment", {
          ...stroke,
          authorUserId: authResult.userId,
          createdAt: stroke.createdAt.toISOString()
        });
      }

      return NextResponse.json({ success: true });
    }

    if (!alreadySaved) {
      room.whiteboardStrokes = [...existingStrokes, stroke].slice(-120);
      await room.save();
    }

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "whiteboard-stroke", {
        ...stroke,
        authorUserId: authResult.userId,
        createdAt: stroke.createdAt.toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("study-room:whiteboard", error);
  }
}

export async function DELETE(request: Request, { params }: { params: { roomCode: string } }) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const parsedRoomCode = roomCodeRouteParamSchema.safeParse(params.roomCode);
    if (!parsedRoomCode.success) {
      return buildValidationErrorResponse(parsedRoomCode.error);
    }

    const rate = await applyRouteRateLimit(
      createUserRateLimitKey("study-room-whiteboard-clear", authResult.userId, request),
      "studyRoomWhiteboardFinal"
    );
    if (rate) return rate;

    await connectToDatabase();
    const room = await StudyRoomModel.findOne({ roomCode: parsedRoomCode.data, isActive: true });
    if (!room || !room.members.some((member: StudyRoomMember) => member.userId.toString() === authResult.userId)) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostUserId.toString() !== authResult.userId) {
      return buildForbiddenResponse("Only the room host can clear the whiteboard.");
    }

    room.whiteboardStrokes = [];
    await room.save();

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "whiteboard-cleared", {
        clearedAt: new Date().toISOString(),
        clearedByUserId: authResult.userId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("study-room:whiteboard:clear", error);
  }
}
