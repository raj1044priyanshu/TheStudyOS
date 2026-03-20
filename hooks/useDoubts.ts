"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { DoubtMessage } from "@/types";

export function useDoubts(subject: string) {
  const [messages, setMessages] = useState<DoubtMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(message: string) {
    const history = messages.slice(-10).map((item) => ({ role: item.role, content: item.content }));
    const nextMessages: DoubtMessage[] = [
      ...messages,
      { role: "user", content: message, timestamp: new Date().toISOString() }
    ];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, subject })
      });

      if (!response.ok) {
        const errorMessage = await response.text().catch(() => "");
        throw new Error(errorMessage || "Could not get tutor help right now");
      }

      if (!response.body) {
        throw new Error("Tutor response stream was empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", timestamp: new Date().toISOString() } satisfies DoubtMessage
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const idx = copy.length - 1;
          if (idx >= 0) {
            copy[idx] = { ...copy[idx], content: aiContent };
          }
          return copy;
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not get tutor help right now");
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([]);
  }

  return { messages, loading, ask, reset };
}
