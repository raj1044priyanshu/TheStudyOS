import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { generateJsonWithFallback } from "@/lib/ai";
import { pusherServer } from "@/lib/pusher";
import { redis } from "@/lib/ratelimit";
import { roomLeaderboardKey, roomQuestionsKey } from "@/lib/study-room";
import type { QuizQuestion, StudyRoomMember } from "@/types";

const schema = z.object({
  topic: z.string().min(2),
  subject: z.string().min(2),
  numQuestions: z.number().min(1).max(10).default(5)
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
      return NextResponse.json({ error: "Only the host can start quiz battle" }, { status: 403 });
    }

    const result = await generateJsonWithFallback<{ questions: QuizQuestion[] }>({
      prompt: `Create exactly ${parsed.data.numQuestions} multiple-choice questions for ${parsed.data.subject} on "${parsed.data.topic}".
Return ONLY valid JSON:
{ "questions": [{ "question": "", "options": { "A": "", "B": "", "C": "", "D": "" }, "correct": "A", "explanation": "" }] }`
    });

    const leaderboard = Object.fromEntries(
      room.members.map((member: StudyRoomMember) => [
        member.userId.toString(),
        {
          userId: member.userId.toString(),
          name: member.name,
          avatar: member.avatar,
          score: 0,
          answers: [],
          streak: 0
        }
      ])
    );

    if (redis) {
      await redis.set(roomLeaderboardKey(room.roomCode), leaderboard, { ex: 4 * 60 * 60 });
      await redis.set(roomQuestionsKey(room.roomCode), result.data.questions ?? [], { ex: 4 * 60 * 60 });
    }

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "quiz-battle-start", {
        topic: parsed.data.topic,
        subject: parsed.data.subject,
        questions: result.data.questions ?? []
      });
    }

    return NextResponse.json({ questions: result.data.questions ?? [] });
  } catch (error) {
    return routeError("study-room:quiz-battle", error);
  }
}
