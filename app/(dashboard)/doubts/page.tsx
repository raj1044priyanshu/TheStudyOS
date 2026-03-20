"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/doubts/ChatInterface";
import { VoiceDoubts } from "@/components/doubts/VoiceDoubts";

export default function DoubtsPage() {
  const [mode, setMode] = useState<"type" | "voice">("type");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Conversation</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Doubt Solver</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Ask anything and get step-by-step explanations in a calmer chat workspace designed for focused problem solving.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("type")}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            mode === "type" ? "border-transparent bg-[#7B6CF6] text-white" : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--muted-foreground)]"
          }`}
        >
          ⌨️ Type
        </button>
        <button
          type="button"
          onClick={() => setMode("voice")}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            mode === "voice" ? "border-transparent bg-[#7B6CF6] text-white" : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--muted-foreground)]"
          }`}
        >
          🎙 Voice
        </button>
      </div>
      {mode === "type" ? <ChatInterface /> : <VoiceDoubts />}
    </div>
  );
}
