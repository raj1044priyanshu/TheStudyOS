"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconVolume, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { SUBJECTS } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { triggerAchievementCheck } from "@/lib/client-achievements";

const STORAGE_KEY = "studyos-focus-session";

const DURATIONS = [25, 45, 60, 90] as const;

const SOUNDS = [
  { key: "Rain", icon: "🌧", url: "https://assets.mixkit.co/active_storage/sfx/124/124-preview.mp3" },
  { key: "Cafe", icon: "☕", url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" },
  { key: "Library", icon: "📚", url: "https://assets.mixkit.co/active_storage/sfx/2532/2532-preview.mp3" },
  { key: "Forest", icon: "🌲", url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3" },
  { key: "Ocean", icon: "🌊", url: "https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3" },
  { key: "White Noise", icon: "⬜", url: "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3" }
] as const;

const QUOTES = [
  "The important thing is not to stop questioning. — Albert Einstein",
  "Nature uses only the longest threads to weave her patterns. — Richard Feynman",
  "Somewhere, something incredible is waiting to be known. — Carl Sagan",
  "Science is a way of thinking much more than it is a body of knowledge. — Carl Sagan",
  "What we know is a drop, what we don't know is an ocean. — Isaac Newton",
  "Study hard what interests you the most in the most undisciplined, irreverent, and original manner possible. — Richard Feynman",
  "The beautiful thing about learning is that no one can take it away from you. — B.B. King",
  "An investment in knowledge pays the best interest. — Benjamin Franklin",
  "The more I read, the more I acquire, the more certain I am that I know nothing. — Voltaire",
  "Learning never exhausts the mind. — Leonardo da Vinci",
  "The future depends on what you do today. — Mahatma Gandhi",
  "You cannot teach a man anything; you can only help him find it within himself. — Galileo",
  "Success is the sum of small efforts, repeated day in and day out. — Robert Collier",
  "Focus is a matter of deciding what things you’re not going to do. — John Carmack",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Do not wait to strike till the iron is hot; but make it hot by striking. — William Butler Yeats",
  "The expert in anything was once a beginner. — Helen Hayes",
  "Without deviation from the norm, progress is not possible. — Frank Zappa",
  "Energy and persistence conquer all things. — Benjamin Franklin",
  "Great things are done by a series of small things brought together. — Vincent van Gogh"
];

interface CompletionPayload {
  streak: number;
  message: string;
  nextTopicSuggestion?: {
    nextTopic: string;
    reason: string;
  };
}

interface PersistedState {
  subject: string;
  topic: string;
  duration: number;
  soundUsed: string;
  phase: "setup" | "active";
  remainingMs: number;
  isRunning: boolean;
  endsAt: number | null;
}

export function FocusRoom() {
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(25);
  const [soundUsed, setSoundUsed] = useState<(typeof SOUNDS)[number]["key"]>("Rain");
  const [phase, setPhase] = useState<"setup" | "active" | "complete">("setup");
  const [remainingMs, setRemainingMs] = useState(duration * 60 * 1000);
  const [isRunning, setIsRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.35);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completion, setCompletion] = useState<CompletionPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const visiblePausedAudioRef = useRef(false);

  const selectedSound = useMemo(() => SOUNDS.find((sound) => sound.key === soundUsed) ?? SOUNDS[0], [soundUsed]);
  const progress = useMemo(() => {
    const totalMs = duration * 60 * 1000;
    return Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100));
  }, [duration, remainingMs]);
  const displayedTime = useMemo(() => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingMs]);
  const quote = useMemo(() => {
    const elapsedMinutes = Math.floor((duration * 60 * 1000 - remainingMs) / (5 * 60 * 1000));
    return QUOTES[elapsedMinutes % QUOTES.length];
  }, [duration, remainingMs]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PersistedState;
      setSubject(saved.subject);
      setTopic(saved.topic);
      setDuration(saved.duration as (typeof DURATIONS)[number]);
      setSoundUsed(saved.soundUsed as (typeof SOUNDS)[number]["key"]);
      setRemainingMs(saved.remainingMs);
      setIsRunning(saved.isRunning);
      setEndsAt(saved.endsAt);
      if (saved.phase === "active") {
        setPhase("active");
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (phase === "complete") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: PersistedState = {
      subject,
      topic,
      duration,
      soundUsed,
      phase,
      remainingMs,
      isRunning,
      endsAt
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [subject, topic, duration, soundUsed, phase, remainingMs, isRunning, endsAt]);

  useEffect(() => {
    if (phase !== "active") {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      return;
    }

    const tick = () => {
      if (!isRunning || !endsAt) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const nextRemaining = Math.max(0, endsAt - Date.now());
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0) {
        void completeSession(true);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [phase, isRunning, endsAt]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (phase === "active") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!audioRef.current) return;
      if (document.hidden) {
        if (!audioRef.current.paused) {
          visiblePausedAudioRef.current = true;
          audioRef.current.pause();
        }
      } else if (visiblePausedAudioRef.current && phase === "active") {
        visiblePausedAudioRef.current = false;
        void audioRef.current.play().catch(() => {
          setAudioUnavailable(true);
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (phase !== "active") {
      audioRef.current?.pause();
      releaseWakeLock();
      return;
    }
    void requestWakeLock();
    if (audioRef.current) {
      audioRef.current.src = selectedSound.url;
      audioRef.current.loop = true;
      void audioRef.current.play().catch(() => {
        setAudioUnavailable(true);
      });
    }
  }, [phase, selectedSound.url]);

  useEffect(() => {
    if (phase === "complete") {
      void confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
    }
  }, [phase]);

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      // Keep this silent on unsupported devices.
    }
  }

  function releaseWakeLock() {
    void wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }

  function enterRoom() {
    const totalMs = duration * 60 * 1000;
    setRemainingMs(totalMs);
    setEndsAt(Date.now() + totalMs);
    setIsRunning(true);
    setPhase("active");
    setCompletion(null);
  }

  function togglePause() {
    if (!isRunning) {
      setEndsAt(Date.now() + remainingMs);
      setIsRunning(true);
      void audioRef.current?.play().catch(() => {
        setAudioUnavailable(true);
      });
      return;
    }

    if (endsAt) {
      setRemainingMs(Math.max(0, endsAt - Date.now()));
    }
    setIsRunning(false);
    audioRef.current?.pause();
  }

  async function completeSession(wasCompleted: boolean) {
    setSubmitting(true);
    setPhase("complete");
    setIsRunning(false);
    audioRef.current?.pause();
    releaseWakeLock();
    setConfirmOpen(false);

    try {
      const response = await fetch("/api/focus/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, duration, wasCompleted, soundUsed })
      });
      const data = (await response.json().catch(() => null)) as CompletionPayload | null;
      if (!response.ok || !data) {
        throw new Error("Could not save session");
      }
      setCompletion(data);
      void triggerAchievementCheck("focus_completed");
      if (duration >= 60) {
        void triggerAchievementCheck("focus_60");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save session");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setPhase("setup");
    setRemainingMs(duration * 60 * 1000);
    setEndsAt(null);
    setIsRunning(false);
    setCompletion(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }

  const circumference = 2 * Math.PI * 140;
  const dashOffset = circumference - (circumference * progress) / 100;

  return (
    <>
      <audio
        ref={audioRef}
        onError={() => setAudioUnavailable(true)}
        preload="auto"
        aria-hidden="true"
      />

      {phase === "setup" ? (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Deep Work</p>
            <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Focus Room</h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Build a calm session with a precise timer, ambient sound, and a clean finish screen that rolls into your streak and next-step suggestion.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="glass-card space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Subject</label>
                  <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
                    {SUBJECTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Topic</label>
                  <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Quadratic equations" />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">Duration</p>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setDuration(option);
                        setRemainingMs(option * 60 * 1000);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        duration === option
                          ? "border-transparent bg-[#7B6CF6] text-white shadow-[0_12px_24px_rgba(123,108,246,0.24)]"
                          : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {option} min
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={enterRoom} disabled={!topic.trim()} className="w-full rounded-full">
                Enter Focus Room
              </Button>
            </div>

            <div className="glass-card p-6">
              <p className="mb-4 text-sm font-medium text-[var(--foreground)]">Ambient sound</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SOUNDS.map((sound) => (
                  <button
                    key={sound.key}
                    type="button"
                    onClick={() => setSoundUsed(sound.key)}
                    className={`surface-card rounded-[22px] border p-4 text-left transition ${
                      soundUsed === sound.key ? "border-[#7B6CF6] shadow-[0_14px_28px_rgba(123,108,246,0.14)]" : "border-transparent"
                    }`}
                  >
                    <p className="text-2xl">{sound.icon}</p>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{sound.key}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "active" ? (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[radial-gradient(circle_at_top,#241b47_0%,rgba(17,24,39,0.98)_55%,rgba(12,14,24,1)_100%)] p-4 text-white">
          <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-8">
            <div className="relative flex h-[320px] w-[320px] items-center justify-center sm:h-[360px] sm:w-[360px]">
              <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="160" cy="160" r="140" stroke="rgba(123,108,246,0.2)" strokeWidth="16" fill="none" />
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  stroke="#7B6CF6"
                  strokeWidth="16"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="text-center">
                <p className="font-headline text-[4rem] leading-none tracking-[-0.05em] sm:text-[4.6rem]">{displayedTime}</p>
                <p className="mt-4 text-sm text-white/70">
                  {subject} • {topic}
                </p>
              </div>
            </div>

            <div className="max-w-2xl text-center">
              <p className="font-headline text-[1.7rem] italic leading-8 text-white/90 transition-opacity duration-300">{quote}</p>
            </div>

            <div className="glass-nav flex w-full max-w-3xl flex-col gap-3 rounded-full border border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={togglePause} className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  {isRunning ? <IconPlayerPauseFilled className="mr-2 h-4 w-4" /> : <IconPlayerPlayFilled className="mr-2 h-4 w-4" />}
                  {isRunning ? "Pause" : "Resume"}
                </Button>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <IconVolume className="h-4 w-4" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">{selectedSound.key}</span>
                <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="rounded-full text-white hover:bg-white/10 hover:text-white">
                  <IconX className="mr-2 h-4 w-4" />
                  End Session
                </Button>
              </div>
            </div>

            {audioUnavailable ? <p className="text-xs text-white/65">🔇 Audio unavailable</p> : null}
          </div>
        </div>
      ) : null}

      {phase === "complete" ? (
        <div className="glass-card mx-auto max-w-3xl p-8 text-center">
          <p className="font-headline text-5xl tracking-[-0.05em] text-[var(--foreground)]">Session Complete! 🎉</p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            {duration} minutes on {subject} • {topic}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Time Studied</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{duration}m</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Subject</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{subject}</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Streak</p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">🔥 {completion?.streak ?? "—"}</p>
            </div>
          </div>

          <div className="surface-card mt-6 rounded-[24px] p-5 text-left">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Next Topic Suggestion</p>
            <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{completion?.nextTopicSuggestion?.nextTopic ?? "Preparing suggestion..."}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{completion?.nextTopicSuggestion?.reason ?? "We’re saving your session details."}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={resetAll} disabled={submitting}>
              Start Another Session
            </Button>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="End focus session?"
        description="We’ll save your session progress so your streak and study log still stay accurate."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep Going
            </Button>
            <Button onClick={() => void completeSession(false)}>End Session</Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          You still have {displayedTime} left in this session. If you end now, we’ll save it as an incomplete focus block.
        </p>
      </Dialog>
    </>
  );
}
