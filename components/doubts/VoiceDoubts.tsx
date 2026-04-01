"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconMicrophone, IconPlayerPause, IconVolumeOff } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SUBJECTS, SUBJECT_COLOR_VALUES } from "@/lib/constants";
import type { DoubtMessage } from "@/types";

type VoiceState = "idle" | "recording" | "processing" | "speaking";

type RecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function stripMarkdown(text: string) {
  return text.replace(/[`*_#>-]/g, "").replace(/\s+/g, " ").trim();
}

export function VoiceDoubts() {
  const [subject, setSubject] = useState("Mathematics");
  const [messages, setMessages] = useState<DoubtMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<InstanceType<RecognitionConstructor> | null>(null);
  const interimTranscriptRef = useRef("");
  const voiceStateRef = useRef<VoiceState>("idle");

  const speak = useCallback(
    async (text: string) => {
      if (muted || !text) return;
      setVoiceState("speaking");

      const speakNow = () => {
        const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.lang = "en-IN";
        utterance.onend = () => setVoiceState("idle");
        window.speechSynthesis.speak(utterance);
      };

      if (!window.speechSynthesis.getVoices().length) {
        window.speechSynthesis.onvoiceschanged = () => speakNow();
        return;
      }
      speakNow();
    },
    [muted]
  );

  const submitTranscript = useCallback(
    async (message: string) => {
      if (!message) {
        setVoiceState("idle");
        return;
      }

      setVoiceState("processing");
      setInterimTranscript("");
      interimTranscriptRef.current = "";
      const history = messages.slice(-10).map((item) => ({ role: item.role, content: item.content }));
      const nextMessages: DoubtMessage[] = [
        ...messages,
        { role: "user", content: message, timestamp: new Date().toISOString(), inputMode: "voice" }
      ];
      setMessages(nextMessages);

      try {
        const response = await fetch("/api/doubts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history, subject })
        });
        if (!response.ok || !response.body) {
          throw new Error("Could not get a voice response right now.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let guideContent = "";

        setMessages((prev) => [
          ...prev,
          { role: "guide", content: "", timestamp: new Date().toISOString() }
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          guideContent += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: guideContent
            };
            return copy;
          });
        }

        await speak(guideContent);
        if (muted) {
          setVoiceState("idle");
        }
      } catch (error) {
        setVoiceState("idle");
        toast.error(error instanceof Error ? error.message : "Could not solve this doubt.");
      }
    },
    [messages, muted, speak, subject]
  );

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? ((window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor })
            .SpeechRecognition ??
            (window as typeof window & { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition)
        : undefined;

    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => (result as ArrayLike<{ transcript: string }>)[0]?.transcript ?? "")
        .join(" ");
      interimTranscriptRef.current = transcript;
      setInterimTranscript(transcript);
    };
    recognition.onerror = (event) => {
      setVoiceState("idle");
      const messageMap: Record<string, string> = {
        "not-allowed": "Microphone access was denied. Please enable it in your browser settings.",
        "no-speech": "No speech was detected. Try holding the button and speaking again.",
        network: "Speech recognition hit a network issue. Please try again.",
        aborted: "Voice input was interrupted."
      };
      toast.error(messageMap[event.error] ?? "Voice input failed.");
    };
    recognition.onend = () => {
      if (voiceStateRef.current === "recording") {
        void submitTranscript(interimTranscriptRef.current.trim());
      }
    };

    recognitionRef.current = recognition;
  }, [submitTranscript]);

  const lastGuideMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "guide")?.content ?? "",
    [messages]
  );

  function startRecording() {
    if (!supported || !recognitionRef.current) {
      toast.error("Voice input not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    window.speechSynthesis.cancel();
    setInterimTranscript("");
    setVoiceState("recording");
    recognitionRef.current.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select className="max-w-xs" value={subject} onChange={(event) => setSubject(event.target.value)}>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={() => setMuted((value) => !value)}>
          <IconVolumeOff className="mr-2 h-4 w-4" />
          {muted ? "Unmute Voice" : "Mute Voice"}
        </Button>
      </div>

      {!supported ? (
        <div className="surface-card rounded-[24px] p-5 text-sm leading-6 text-[var(--muted-foreground)]">
          Voice input not supported in this browser. Please use Chrome or Edge.
        </div>
      ) : null}

      <div className="surface-card relative min-h-[55dvh] rounded-[28px] p-5">
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[color:var(--panel-border)] p-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">Hold the mic button and ask your doubt out loud.</p>
              </div>
            ) : null}

            {messages.map((message, index) => {
              const color = SUBJECT_COLOR_VALUES[subject] ?? SUBJECT_COLOR_VALUES.Other;
              return (
                <div key={`${message.timestamp}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-[#7B6CF6] text-white shadow-[0_14px_30px_rgba(123,108,246,0.22)]"
                        : "border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] text-[var(--foreground)]"
                    }`}
                    style={message.role === "guide" ? { borderColor: `${color}30` } : undefined}
                  >
                    {message.role === "user" && message.inputMode === "voice" ? <IconMicrophone className="mr-2 inline h-4 w-4" /> : null}
                    {message.content}
                  </div>
                </div>
              );
            })}

            {voiceState === "speaking" && lastGuideMessage ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#7B6CF6]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#7B6CF6] [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#7B6CF6] [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {interimTranscript ? (
              <div className="rounded-full border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                {interimTranscript}
              </div>
            ) : null}

            <div className="flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => voiceState === "recording" && stopRecording()}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full transition ${
                  voiceState === "recording"
                    ? "bg-[#7B6CF6] text-white shadow-[0_0_0_16px_rgba(123,108,246,0.12),0_0_0_32px_rgba(123,108,246,0.08)]"
                    : "glass-card text-[var(--foreground)]"
                }`}
              >
                {voiceState === "processing" ? <IconPlayerPause className="h-8 w-8 animate-spin" /> : <IconMicrophone className="h-8 w-8" />}
              </button>
              <p className="text-sm text-[var(--muted-foreground)]">
                {voiceState === "recording"
                  ? "Listening..."
                  : voiceState === "processing"
                    ? "Thinking..."
                    : voiceState === "speaking"
                      ? "Speaking..."
                      : "Hold to speak"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
