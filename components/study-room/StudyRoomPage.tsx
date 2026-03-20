"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";

interface RoomMember {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: string;
}

interface StudyRoom {
  roomCode: string;
  subject: string;
  members: RoomMember[];
  hostUserId: string;
  timerDuration: number;
  timerStartedAt?: string | null;
  timerPaused: boolean;
}

export function StudyRoomPage() {
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ author: string; content: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineCap = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#7B6CF6";
  }, [room]);

  async function createRoom() {
    const response = await fetch("/api/study-room/create", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not create room");
      return;
    }
    setRealtimeReady(Boolean(data.realtimeReady));
    await joinRoom(data.roomCode);
  }

  async function joinRoom(nextCode?: string) {
    const code = (nextCode ?? roomCodeInput).trim().toUpperCase();
    const response = await fetch("/api/study-room/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: code })
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not join room");
      return;
    }
    setRoom(data.room);
    setRoomCodeInput(code);
    setMessages([{ author: "System", content: `Joined room ${code}` }]);
  }

  async function updateTimer(action: "start" | "pause" | "reset") {
    if (!room) return;
    const response = await fetch(`/api/study-room/${room.roomCode}/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, duration: room.timerDuration })
    });
    const data = await response.json();
    if (response.ok) {
      setRoom(data.room);
    }
  }

  async function startQuizBattle() {
    if (!room) return;
    const response = await fetch(`/api/study-room/${room.roomCode}/quiz-battle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Quick Revision", subject: room.subject || "General", numQuestions: 5 })
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not start quiz battle");
      return;
    }
    toast.success(`Quiz battle started with ${data.questions?.length ?? 0} questions`);
  }

  async function sendMessage() {
    if (!room || !chatInput.trim()) return;
    await fetch(`/api/study-room/${room.roomCode}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: chatInput })
    });
    setMessages((prev) => [...prev, { author: "You", content: chatInput }]);
    setChatInput("");
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
    context.beginPath();
    context.moveTo(x, y);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !drawingRef.current) return;
    const { x, y } = pointerPosition(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function stopDrawing() {
    drawingRef.current = false;
  }

  function exportWhiteboard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "study-room-whiteboard.png";
    link.click();
  }

  if (!room) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Collaboration</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Study Room</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            Create a room, share the code, and coordinate revision together with a shared timer, whiteboard, and quick quiz battle controls.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="glass-card space-y-4 p-6">
            <p className="text-lg font-semibold text-[var(--foreground)]">Create Room</p>
            <Button onClick={() => void createRoom()}>Create Room</Button>
          </div>
          <div className="glass-card space-y-4 p-6">
            <p className="text-lg font-semibold text-[var(--foreground)]">Join Room</p>
            <Input value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} />
            <Button onClick={() => void joinRoom()}>Join Room</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!realtimeReady ? (
        <div className="rounded-[22px] bg-[#FCD34D]/18 px-5 py-4 text-sm text-[#92400E]">
          Real-time sync is unavailable until Pusher environment variables are configured. You can still create rooms and use the local whiteboard layout.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[200px_1fr_260px_220px]">
        <aside className="glass-card space-y-4 p-4">
          <p className="font-semibold text-[var(--foreground)]">Room: {room.roomCode}</p>
          <Button variant="outline" onClick={() => void navigator.clipboard.writeText(room.roomCode)}>
            Copy Code
          </Button>
          <div className="space-y-2">
            {room.members.map((member) => (
              <div key={member.userId} className="surface-card rounded-[18px] px-3 py-2 text-sm text-[var(--foreground)]">
                {member.name}
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setRoom(null)}>
            Leave Room
          </Button>
        </aside>

        <section className="glass-card space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-[var(--foreground)]">Whiteboard</p>
            <Button variant="outline" onClick={exportWhiteboard}>
              Export Whiteboard
            </Button>
          </div>
          <canvas
            ref={canvasRef}
            width={900}
            height={560}
            className="h-[560px] w-full rounded-[24px] bg-white"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
          />
        </section>

        <section className="glass-card flex min-h-[560px] flex-col p-4">
          <p className="font-semibold text-[var(--foreground)]">Chat</p>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {messages.length ? (
              messages.map((message, index) => (
                <div key={`${message.author}-${index}`} className="surface-card rounded-[18px] p-3 text-sm">
                  <p className="font-medium text-[var(--foreground)]">{message.author}</p>
                  <p className="mt-1 text-[var(--muted-foreground)]">{message.content}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No messages yet" description="Messages stay live inside the room." />
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Message the room..." />
            <Button onClick={() => void sendMessage()}>Send</Button>
          </div>
        </section>

        <aside className="glass-card space-y-4 p-4">
          <p className="font-semibold text-[var(--foreground)]">Controls</p>
          <div className="surface-card rounded-[22px] p-4 text-center">
            <p className="font-headline text-[2.8rem] text-[var(--foreground)]">{room.timerDuration}m</p>
            <p className="text-sm text-[var(--muted-foreground)]">{room.timerPaused ? "Paused" : "Running"}</p>
          </div>
          <div className="grid gap-2">
            <Button onClick={() => void updateTimer("start")}>Start</Button>
            <Button variant="outline" onClick={() => void updateTimer("pause")}>
              Pause
            </Button>
            <Button variant="outline" onClick={() => void updateTimer("reset")}>
              Reset
            </Button>
            <Button onClick={() => void startQuizBattle()}>⚔️ Start Quiz Battle</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
