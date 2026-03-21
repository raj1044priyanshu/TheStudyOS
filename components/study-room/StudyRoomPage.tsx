"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  IconBolt,
  IconCopy,
  IconLoader2,
  IconMessageCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconTrophy,
  IconUsers
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPusherClientConfig } from "@/lib/pusher-client";
import type {
  QuizOptionKey,
  QuizQuestion,
  StudyRoomChatMessage,
  StudyRoomLeaderboardEntry,
  StudyRoomPayload,
  StudyRoomWhiteboardStroke
} from "@/types";

interface JoinedRoomResponse {
  room: StudyRoomPayload;
  realtimeReady?: boolean;
  error?: string;
}

interface ActiveQuizState {
  topic: string;
  subject: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  questionStartedAt: number;
  status: "live" | "complete";
}

interface JoinOptions {
  silent?: boolean;
  syncUrl?: boolean;
  knownRealtimeReady?: boolean;
}

interface PusherSubscriptionErrorPayload {
  status?: number;
  type?: string;
  error?: string;
}

function createWhiteboardStrokeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `stroke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function appendUniqueWhiteboardStroke(previous: StudyRoomWhiteboardStroke[], stroke: StudyRoomWhiteboardStroke) {
  if (previous.some((item) => item.strokeId === stroke.strokeId)) {
    return previous;
  }

  return [...previous, stroke].slice(-120);
}

function drawWhiteboardStroke(context: CanvasRenderingContext2D, stroke: StudyRoomWhiteboardStroke) {
  if (stroke.points.length < 2) {
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;
  context.strokeStyle = stroke.color;
  context.beginPath();
  context.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (const point of stroke.points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
  context.restore();
}

function redrawWhiteboardCanvas(canvas: HTMLCanvasElement, strokes: StudyRoomWhiteboardStroke[]) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    drawWhiteboardStroke(context, stroke);
  }
}

function normalizeRoom(room: StudyRoomPayload): StudyRoomPayload {
  return {
    ...room,
    timerStartedAt: room.timerStartedAt ? new Date(room.timerStartedAt).toISOString() : null,
    whiteboardStrokes: (room.whiteboardStrokes ?? []).map((stroke) => ({
      ...stroke,
      authorUserId: String(stroke.authorUserId),
      createdAt: stroke.createdAt ? new Date(stroke.createdAt).toISOString() : new Date().toISOString(),
      points: stroke.points.map((point) => ({
        x: Number(point.x),
        y: Number(point.y)
      }))
    })),
    members: room.members.map((member) => ({
      ...member,
      joinedAt: member.joinedAt ? new Date(member.joinedAt).toISOString() : new Date().toISOString(),
      isHost: member.userId === room.hostUserId,
      online: member.online ?? true
    }))
  };
}

function appendUniqueMessage(
  previous: StudyRoomChatMessage[],
  nextMessage: StudyRoomChatMessage
) {
  const exists = previous.some(
    (message) =>
      message.userId === nextMessage.userId &&
      message.timestamp === nextMessage.timestamp &&
      message.content === nextMessage.content
  );

  if (exists) {
    return previous;
  }

  return [...previous, nextMessage];
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StudyRoomPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [room, setRoom] = useState<StudyRoomPayload | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeIssue, setRealtimeIssue] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<StudyRoomChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudyRoomLeaderboardEntry[]>([]);
  const [quizState, setQuizState] = useState<ActiveQuizState | null>(null);
  const [roomActionLoading, setRoomActionLoading] = useState<"create" | "join" | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokePointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const autoJoinedCodeRef = useRef<string | null>(null);

  const currentUserId = session?.user?.id ?? "";
  const publicRealtimeConfig = useMemo(() => getPusherClientConfig(), []);
  const requestedRoomCode = searchParams.get("roomCode")?.trim().toUpperCase() ?? "";
  const canManageRoom = Boolean(room && currentUserId && room.hostUserId === currentUserId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    redrawWhiteboardCanvas(canvas, []);
  }, [room?.roomCode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    redrawWhiteboardCanvas(canvas, room?.whiteboardStrokes ?? []);
  }, [room?.whiteboardStrokes]);

  useEffect(() => {
    if (!room || room.timerPaused || !room.timerStartedAt) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [room]);

  const joinRoom = useCallback(
    async (nextCode?: string, options?: JoinOptions) => {
      const code = (nextCode ?? roomCodeInput).trim().toUpperCase();
      if (!code) {
        return;
      }

      setRoomActionLoading("join");

      try {
        const response = await fetch("/api/study-room/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode: code })
        });
        const data = (await response.json().catch(() => ({}))) as JoinedRoomResponse;

        if (!response.ok || !data.room) {
          throw new Error(data.error ?? "Could not join room");
        }

        const normalizedRoom = normalizeRoom(data.room);
        setRoom(normalizedRoom);
        setRoomCodeInput(code);
        setRealtimeReady(Boolean(options?.knownRealtimeReady ?? data.realtimeReady) && Boolean(publicRealtimeConfig));
        setRealtimeConnected(false);
        setRealtimeIssue(null);
        setLeaderboard([]);
        setQuizState(null);
        setMessages([
          {
            userId: "system",
            name: "System",
            avatar: "",
            content: `Joined room ${code}. Share the code and start studying together.`,
            timestamp: new Date().toISOString(),
            system: true
          }
        ]);

        if (options?.syncUrl ?? true) {
          router.replace(`${pathname}?roomCode=${encodeURIComponent(code)}`, { scroll: false });
        }

        if (!(options?.silent ?? false)) {
          toast.success(`Joined room ${code}`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not join room");
      } finally {
        setRoomActionLoading(null);
      }
    },
    [pathname, publicRealtimeConfig, roomCodeInput, router]
  );

  useEffect(() => {
    if (!requestedRoomCode || autoJoinedCodeRef.current === requestedRoomCode || room?.roomCode === requestedRoomCode) {
      return;
    }

    autoJoinedCodeRef.current = requestedRoomCode;
    void joinRoom(requestedRoomCode, { silent: true, syncUrl: false });
  }, [joinRoom, requestedRoomCode, room?.roomCode]);

  useEffect(() => {
    if (!room || !realtimeReady || !publicRealtimeConfig) {
      setRealtimeConnected(false);
      setRealtimeIssue(null);
      return;
    }

    let pusherClient: {
      subscribe: (channel: string) => {
        bind: (eventName: string, callback: (payload: unknown) => void) => void;
        unbind_all: () => void;
      };
      unsubscribe: (channel: string) => void;
      disconnect: () => void;
    } | null = null;
    const channelName = `presence-room-${room.roomCode}`;

    void import("pusher-js")
      .then(({ default: Pusher }) => {
        const client = new Pusher(publicRealtimeConfig.key, {
          cluster: publicRealtimeConfig.cluster,
          channelAuthorization: {
            endpoint: "/api/pusher/auth",
            transport: "ajax"
          }
        });

        const channel = client.subscribe(channelName);

        channel.bind("pusher:subscription_succeeded", () => {
          setRealtimeConnected(true);
          setRealtimeIssue(null);
        });

        channel.bind("pusher:subscription_error", (error: PusherSubscriptionErrorPayload) => {
          const status = typeof error?.status === "number" ? error.status : null;
          const nextIssue =
            error?.error?.trim() ||
            (status === 400
              ? "Realtime auth was rejected by /api/pusher/auth, so the room is using local-only mode."
              : status === 503
                ? "Realtime sync is unavailable because Pusher is not fully configured on the server."
                : "Realtime sync could not authorize this room subscription.");

          console.error("Study room realtime subscription failed", {
            roomCode: room.roomCode,
            status,
            type: error?.type,
            error: error?.error
          });

          setRealtimeConnected(false);
          setRealtimeIssue(nextIssue);
          toast.error(
            status === 400
              ? "Realtime auth was rejected, so this room will stay in local-only mode."
              : status === 503
                ? "Realtime is unavailable because the Pusher setup is incomplete."
                : "Realtime sync could not connect. The room will stay in local-only mode."
          );
        });

        channel.bind("pusher:member_removed", (member: { id?: string }) => {
          if (!member.id) return;
          setRoom((previous) =>
            previous
              ? {
                  ...previous,
                  members: previous.members.map((item) =>
                    item.userId === member.id ? { ...item, online: false } : item
                  )
                }
              : previous
          );
        });

        channel.bind("member-joined", (payload: { userId: string; name: string; avatar?: string; timestamp?: string }) => {
          setRoom((previous) => {
            if (!previous) return previous;
            const existing = previous.members.find((member) => member.userId === payload.userId);
            const nextMember = {
              userId: payload.userId,
              name: payload.name,
              avatar: payload.avatar ?? "",
              joinedAt: payload.timestamp ?? new Date().toISOString(),
              isHost: payload.userId === previous.hostUserId,
              online: true
            };

            return {
              ...previous,
              members: existing
                ? previous.members.map((member) => (member.userId === payload.userId ? { ...member, ...nextMember } : member))
                : [...previous.members, nextMember]
            };
          });
        });

        channel.bind("new-message", (payload: { userId: string; name: string; avatar?: string; content: string; timestamp: string }) => {
          setMessages((previous) =>
            appendUniqueMessage(previous, {
              userId: payload.userId,
              name: payload.name,
              avatar: payload.avatar ?? "",
              content: payload.content,
              timestamp: payload.timestamp
            })
          );
        });

        channel.bind("timer-update", (payload: { timerDuration: number; timerStartedAt?: string | null; timerPaused: boolean }) => {
          setRoom((previous) =>
            previous
              ? {
                  ...previous,
                  timerDuration: payload.timerDuration,
                  timerStartedAt: payload.timerStartedAt ? new Date(payload.timerStartedAt).toISOString() : null,
                  timerPaused: payload.timerPaused
                }
              : previous
          );
          setNow(Date.now());
        });

        channel.bind("quiz-battle-start", (payload: { topic: string; subject: string; questions?: QuizQuestion[] }) => {
          const questions = payload.questions ?? [];
          setQuizState({
            topic: payload.topic,
            subject: payload.subject,
            questions,
            currentQuestionIndex: 0,
            questionStartedAt: Date.now(),
            status: questions.length ? "live" : "complete"
          });
          setLeaderboard([]);
          if (questions.length) {
            toast.success(`Quiz battle started: ${payload.topic}`);
          }
        });

        channel.bind("leaderboard-update", (payload: { leaderboard?: StudyRoomLeaderboardEntry[] }) => {
          setLeaderboard(payload.leaderboard ?? []);
        });

        channel.bind("whiteboard-stroke", (payload: StudyRoomWhiteboardStroke) => {
          const normalizedStroke: StudyRoomWhiteboardStroke = {
            ...payload,
            authorUserId: String(payload.authorUserId),
            createdAt: payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString(),
            points: (payload.points ?? []).map((point) => ({
              x: Number(point.x),
              y: Number(point.y)
            }))
          };

          setRoom((previous) =>
            previous
              ? {
                  ...previous,
                  whiteboardStrokes: appendUniqueWhiteboardStroke(previous.whiteboardStrokes ?? [], normalizedStroke)
                }
              : previous
          );
        });

        pusherClient = client as unknown as typeof pusherClient;
      })
      .catch((error) => {
        console.error("Study room realtime client failed to load", error);
        setRealtimeConnected(false);
        setRealtimeIssue("The realtime client could not load, so this room is using local-only mode.");
      });

    return () => {
      if (!pusherClient) {
        return;
      }

      setRealtimeConnected(false);
      pusherClient.unsubscribe(channelName);
      pusherClient.disconnect();
    };
  }, [publicRealtimeConfig, realtimeReady, room]);

  const syncWhiteboardStroke = useCallback(
    async (stroke: StudyRoomWhiteboardStroke) => {
      if (!room) {
        return;
      }

      try {
        const response = await fetch(`/api/study-room/${room.roomCode}/whiteboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strokeId: stroke.strokeId,
            color: stroke.color,
            width: stroke.width,
            points: stroke.points
          })
        });
        const data = (await response.json().catch(() => ({}))) as { room?: StudyRoomPayload; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not sync whiteboard");
        }

        if (!realtimeReady && data.room) {
          setRoom(normalizeRoom(data.room));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not sync whiteboard");
      }
    },
    [realtimeReady, room]
  );

  async function createRoom() {
    setRoomActionLoading("create");

    try {
      const response = await fetch("/api/study-room/create", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { roomCode?: string; realtimeReady?: boolean; error?: string };

      if (!response.ok || !data.roomCode) {
        throw new Error(data.error ?? "Could not create room");
      }

      toast.success(`Room ${data.roomCode} created`);
      await joinRoom(data.roomCode, {
        silent: true,
        syncUrl: true,
        knownRealtimeReady: data.realtimeReady
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create room");
    } finally {
      setRoomActionLoading(null);
    }
  }

  async function updateTimer(action: "start" | "pause" | "reset") {
    if (!room) return;

    const response = await fetch(`/api/study-room/${room.roomCode}/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, duration: room.timerDuration })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error((data as { error?: string }).error ?? "Could not update timer");
      return;
    }

    if (!realtimeReady && (data as { room?: StudyRoomPayload }).room) {
      setRoom(normalizeRoom((data as { room: StudyRoomPayload }).room));
    }
    setNow(Date.now());
  }

  async function startQuizBattle() {
    if (!room) return;

    const response = await fetch(`/api/study-room/${room.roomCode}/quiz-battle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Quick Revision", subject: room.subject || "General", numQuestions: 5 })
    });
    const data = (await response.json().catch(() => ({}))) as { questions?: QuizQuestion[]; error?: string };

    if (!response.ok) {
      toast.error(data.error ?? "Could not start quiz battle");
      return;
    }

    const questions = data.questions ?? [];
    if (!realtimeReady) {
      setQuizState({
        topic: "Quick Revision",
        subject: room.subject || "General",
        questions,
        currentQuestionIndex: 0,
        questionStartedAt: Date.now(),
        status: questions.length ? "live" : "complete"
      });
    }

    toast.success(`Quiz battle started with ${questions.length} questions`);
  }

  async function submitQuizAnswer(answer: QuizOptionKey) {
    if (!room || !quizState || quizState.status !== "live") {
      return;
    }

    setAnswerLoading(true);

    try {
      const response = await fetch(`/api/study-room/${room.roomCode}/quiz-battle/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: quizState.currentQuestionIndex,
          answer,
          timeTaken: Math.max(1, Math.round((Date.now() - quizState.questionStartedAt) / 1000))
        })
      });
      const data = (await response.json().catch(() => ({}))) as { leaderboard?: StudyRoomLeaderboardEntry[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit answer");
      }

      setLeaderboard(data.leaderboard ?? []);
      setQuizState((previous) => {
        if (!previous) {
          return previous;
        }

        const nextIndex = previous.currentQuestionIndex + 1;
        if (nextIndex >= previous.questions.length) {
          toast.success("Quiz battle complete");
          return { ...previous, status: "complete" };
        }

        return {
          ...previous,
          currentQuestionIndex: nextIndex,
          questionStartedAt: Date.now()
        };
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit answer");
    } finally {
      setAnswerLoading(false);
    }
  }

  async function sendMessage() {
    if (!room || !chatInput.trim()) return;

    const trimmedMessage = chatInput.trim();

    try {
      const response = await fetch(`/api/study-room/${room.roomCode}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmedMessage })
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not send message");
      }

      if (!realtimeReady) {
        setMessages((previous) =>
          appendUniqueMessage(previous, {
            userId: currentUserId || "local",
            name: "You",
            avatar: session?.user?.image ?? "",
            content: trimmedMessage,
            timestamp: new Date().toISOString()
          })
        );
      }

      setChatInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message");
    }
  }

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const { x, y } = pointerPosition(event);
    drawingRef.current = true;
    strokePointsRef.current = [{ x, y }];
    context.beginPath();
    context.moveTo(x, y);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !drawingRef.current) return;
    const { x, y } = pointerPosition(event);
    strokePointsRef.current.push({ x, y });
    context.lineTo(x, y);
    context.stroke();
  }

  function stopDrawing() {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    const points = strokePointsRef.current;
    strokePointsRef.current = [];

    if (!room || points.length < 2) {
      return;
    }

    const stroke: StudyRoomWhiteboardStroke = {
      strokeId: createWhiteboardStrokeId(),
      authorUserId: currentUserId || "local",
      color: "#7B6CF6",
      width: 3,
      points,
      createdAt: new Date().toISOString()
    };

    setRoom((previous) =>
      previous
        ? {
            ...previous,
            whiteboardStrokes: appendUniqueWhiteboardStroke(previous.whiteboardStrokes ?? [], stroke)
          }
        : previous
    );
    void syncWhiteboardStroke(stroke);
  }

  function exportWhiteboard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "study-room-whiteboard.png";
    link.click();
  }

  function leaveRoom() {
    setRoom(null);
    setRealtimeConnected(false);
    setRealtimeIssue(null);
    setLeaderboard([]);
    setQuizState(null);
    setMessages([]);
    router.replace(pathname, { scroll: false });
  }

  const timerSecondsRemaining = useMemo(() => {
    if (!room) return 0;
    if (room.timerPaused || !room.timerStartedAt) {
      return room.timerDuration * 60;
    }

    const startedAt = new Date(room.timerStartedAt).getTime();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    return Math.max(0, room.timerDuration * 60 - elapsedSeconds);
  }, [now, room]);

  const formattedTimer = useMemo(() => formatTimer(timerSecondsRemaining), [timerSecondsRemaining]);
  const activeQuestion = quizState?.status === "live" ? quizState.questions[quizState.currentQuestionIndex] : null;

  if (!room) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Collaboration</p>
          <h2 className="mt-2 font-headline text-[clamp(2rem,5vw,3rem)] tracking-[-0.04em] text-[var(--foreground)]">Study Room</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            Create a room, share the code, and coordinate revision together with a shared timer, whiteboard, live chat, and quiz battle controls.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass-card space-y-4 p-5 sm:p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#7B6CF6]/14 text-[#7B6CF6]">
              <IconUsers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">Create a room</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Start a shared room for your friends, then move into the whiteboard, timer, chat, and live quiz tools together.
              </p>
            </div>
            <Button onClick={() => void createRoom()} disabled={roomActionLoading !== null}>
              {roomActionLoading === "create" ? "Creating room..." : "Create Room"}
            </Button>
          </div>

          <div className="glass-card space-y-4 p-5 sm:p-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#6EE7B7]/14 text-[#0F766E]">
              <IconSparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">Join with a code</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Paste the room code you received and jump straight into the shared workspace.
              </p>
            </div>
            <Input
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
            <Button variant="outline" onClick={() => void joinRoom()} disabled={roomActionLoading !== null || !roomCodeInput.trim()}>
              {roomActionLoading === "join" ? "Joining..." : "Join Room"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass-card rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Room code</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="font-headline text-[clamp(2rem,5vw,3rem)] tracking-[-0.04em] text-[var(--foreground)]">{room.roomCode}</h2>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  realtimeReady
                    ? realtimeConnected
                      ? "bg-[#6EE7B7]/18 text-[#047857]"
                      : realtimeIssue
                        ? "bg-[#FCA5A5]/18 text-[#B91C1C]"
                        : "bg-[#FCD34D]/18 text-[#92400E]"
                    : "bg-[color:var(--surface-low)] text-[var(--muted-foreground)]"
                )}
              >
                {realtimeReady
                  ? realtimeConnected
                    ? "Live sync connected"
                    : realtimeIssue
                      ? "Live sync unavailable"
                      : "Connecting live sync..."
                  : "Local-only mode"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              {realtimeReady
                ? realtimeConnected
                  ? "Members, messages, timer updates, and quiz battle events sync across everyone in the room."
                  : realtimeIssue ?? "Trying to connect live sync for this room."
                : "Realtime sync is unavailable until Pusher environment variables are configured. The room still works locally on this device."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void navigator.clipboard.writeText(room.roomCode)}>
              <IconCopy className="h-4 w-4" />
              Copy Code
            </Button>
            <Button variant="ghost" onClick={leaveRoom}>
              Leave Room
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="glass-card space-y-4 p-4 sm:p-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Members</p>
            <p className="mt-2 font-headline text-[1.9rem] tracking-[-0.03em] text-[var(--foreground)]">
              {room.members.length} in room
            </p>
          </div>
          <div className="space-y-2">
            {room.members.map((member) => (
              <div key={member.userId} className="surface-card flex items-center gap-3 rounded-[20px] px-3 py-3">
                <div className="relative">
                  <Avatar src={member.avatar} alt={member.name} />
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[color:var(--glass-surface-strong)]",
                      member.online === false ? "bg-[#94A3B8]" : "bg-[#22C55E]"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{member.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{member.isHost ? "Host" : member.online === false ? "Offline" : "Connected"}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="glass-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Shared board</p>
              <p className="mt-2 font-headline text-[1.9rem] tracking-[-0.03em] text-[var(--foreground)]">Whiteboard</p>
            </div>
            <Button variant="outline" onClick={exportWhiteboard}>
              Export Whiteboard
            </Button>
          </div>
          <canvas
            ref={canvasRef}
            width={900}
            height={560}
            className="h-[320px] w-full rounded-[24px] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] sm:h-[420px] xl:h-[560px]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </section>

        <div className="space-y-5">
          <section className="glass-card flex min-h-[320px] flex-col p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Chat</p>
                <p className="mt-2 font-headline text-[1.9rem] tracking-[-0.03em] text-[var(--foreground)]">Room feed</p>
              </div>
              <IconMessageCircle className="h-5 w-5 text-[#7B6CF6]" />
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.length ? (
                messages.map((message) => (
                  <div key={`${message.userId}-${message.timestamp}-${message.content}`} className="surface-card rounded-[20px] p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {message.system ? (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#7B6CF6]/14 text-[#7B6CF6]">
                          <IconSparkles className="h-4 w-4" />
                        </span>
                      ) : (
                        <Avatar src={message.avatar} alt={message.name} />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">{message.name}</p>
                        <p className="text-[11px] text-[var(--tertiary-foreground)]">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[var(--muted-foreground)]">{message.content}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No messages yet" description="Messages will appear here once the room starts talking." />
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Message the room..."
              />
              <Button onClick={() => void sendMessage()} disabled={!chatInput.trim()}>
                Send
              </Button>
            </div>
          </section>

          <section className="glass-card space-y-4 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="surface-card rounded-[24px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Shared timer</p>
                <p className="mt-3 font-headline text-[2.4rem] tracking-[-0.04em] text-[var(--foreground)]">{formattedTimer}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{room.timerPaused ? "Paused" : "Running live"}</p>
              </div>

              <div className="surface-card rounded-[24px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Quiz battle</p>
                {activeQuestion ? (
                  <div className="mt-3 space-y-3">
                    <p className="font-medium text-[var(--foreground)]">{activeQuestion.question}</p>
                    <div className="grid gap-2">
                      {Object.entries(activeQuestion.options).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => void submitQuizAnswer(key as QuizOptionKey)}
                          disabled={answerLoading}
                          className="surface-pill rounded-[18px] px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[color:var(--surface-panel-hover)]"
                        >
                          <span className="font-semibold">{key}.</span> {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Question {(quizState?.currentQuestionIndex ?? 0) + 1} of {quizState?.questions.length ?? 0}
                    </p>
                  </div>
                ) : quizState?.status === "complete" ? (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">Quiz battle complete. Review the live leaderboard below.</p>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">Start a quick quiz battle whenever the room is ready.</p>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button onClick={() => void updateTimer("start")} disabled={!canManageRoom}>
                <IconPlayerPlay className="mr-2 h-4 w-4" />
                Start Timer
              </Button>
              <Button variant="outline" onClick={() => void updateTimer("pause")} disabled={!canManageRoom}>
                <IconPlayerPause className="mr-2 h-4 w-4" />
                Pause Timer
              </Button>
              <Button variant="outline" onClick={() => void updateTimer("reset")} disabled={!canManageRoom}>
                <IconRefresh className="mr-2 h-4 w-4" />
                Reset Timer
              </Button>
              <Button onClick={() => void startQuizBattle()} disabled={!canManageRoom}>
                {answerLoading ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconBolt className="mr-2 h-4 w-4" />}
                Start Quiz Battle
              </Button>
            </div>

            {!canManageRoom ? (
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                Only the host can control the shared timer and start quiz battles.
              </p>
            ) : null}

            <div className="surface-card rounded-[24px] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Leaderboard</p>
                  <p className="mt-2 font-headline text-[1.8rem] tracking-[-0.03em] text-[var(--foreground)]">Live scores</p>
                </div>
                <IconTrophy className="h-5 w-5 text-[#7B6CF6]" />
              </div>

              {leaderboard.length ? (
                <div className="mt-4 space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-[18px] bg-[color:var(--surface-low)] px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#7B6CF6]/12 text-sm font-semibold text-[#7B6CF6]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">{entry.name}</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">{entry.answers.length} answers submitted</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{entry.score} pts</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">{entry.streak} streak</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--muted-foreground)]">Scores will appear once the room starts answering quiz questions.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
