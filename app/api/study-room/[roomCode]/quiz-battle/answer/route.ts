import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { StudyRoomModel } from "@/models/StudyRoom";
import { pusherServer } from "@/lib/pusher";
import { redis } from "@/lib/ratelimit";
import { roomLeaderboardKey, roomQuestionsKey } from "@/lib/study-room";
import type { QuizQuestion, StudyRoomMember } from "@/types";

const schema = z.object({
  questionIndex: z.number().min(0),
  answer: z.enum(["A", "B", "C", "D"]),
  timeTaken: z.number().min(0)
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

    const leaderboardKey = roomLeaderboardKey(room.roomCode);
    const questionsKey = roomQuestionsKey(room.roomCode);
    const leaderboard =
      (redis ? await redis.get<Record<string, { userId: string; name: string; avatar: string; score: number; answers: unknown[]; streak: number }>>(leaderboardKey) : null) ?? {};
    const questions = (redis ? await redis.get<QuizQuestion[]>(questionsKey) : null) ?? [];
    const question = questions[parsed.data.questionIndex];
    const isCorrect = question?.correct === parsed.data.answer;
    const current = leaderboard[authResult.userId] ?? {
      userId: authResult.userId,
      name: authResult.session.user?.name ?? "Student",
      avatar: authResult.session.user?.image ?? "",
      score: 0,
      answers: [],
      streak: 0
    };

    const points = isCorrect ? 10 + Math.max(0, 5 - Math.floor(parsed.data.timeTaken / 2)) : 0;
    current.score += points;
    current.answers.push({
      questionIndex: parsed.data.questionIndex,
      answer: parsed.data.answer,
      timeTaken: parsed.data.timeTaken,
      points,
      correct: isCorrect
    });
    current.streak = isCorrect ? current.streak + 1 : 0;
    leaderboard[authResult.userId] = current;

    if (redis) {
      await redis.set(leaderboardKey, leaderboard, { ex: 4 * 60 * 60 });
    }

    if (pusherServer) {
      await pusherServer.trigger(`presence-room-${room.roomCode}`, "leaderboard-update", {
        leaderboard: Object.values(leaderboard).sort((a, b) => b.score - a.score)
      });
    }

    return NextResponse.json({ leaderboard: Object.values(leaderboard).sort((a, b) => b.score - a.score) });
  } catch (error) {
    return routeError("study-room:quiz-answer", error);
  }
}
