"use client";

import { useState } from "react";
import { IconKeyboard, IconMicrophone } from "@tabler/icons-react";
import { ChatInterface } from "@/components/doubts/ChatInterface";
import { VoiceDoubts } from "@/components/doubts/VoiceDoubts";
import { cn } from "@/lib/utils";

export function DoubtsPanel() {
  const [mode, setMode] = useState<"type" | "voice">("type");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Concept help</p>
          <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Doubt Solver</h3>
        </div>
        <div className="flex gap-2">
          {[
            { id: "type" as const, label: "Type", icon: IconKeyboard },
            { id: "voice" as const, label: "Voice", icon: IconMicrophone }
          ].map((option) => {
            const Icon = option.icon;
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-transparent bg-[#7B6CF6] text-white"
                    : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--muted-foreground)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[500px]">{mode === "type" ? <ChatInterface /> : <VoiceDoubts />}</div>
    </div>
  );
}
