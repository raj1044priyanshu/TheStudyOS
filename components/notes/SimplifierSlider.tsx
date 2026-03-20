"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { IconPin, IconSparkles, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { triggerAchievementCheck } from "@/lib/client-achievements";
import type { SimplifyLevel } from "@/types";

const LEVELS: Array<{ value: SimplifyLevel; label: string }> = [
  { value: "phd", label: "PhD" },
  { value: "professor", label: "Professor" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "child", label: "Child" }
];

interface SimplifierSliderProps {
  noteId: string;
  subject: string;
  topic: string;
}

export function SimplifierSlider({ noteId, subject, topic }: SimplifierSliderProps) {
  const [selectedText, setSelectedText] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [level, setLevel] = useState<SimplifyLevel>("student");
  const [result, setResult] = useState<{ simplifiedText: string; wordCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const truncatedText = useMemo(() => selectedText.slice(0, 1000), [selectedText]);
  const originalWordCount = useMemo(() => truncatedText.split(/\s+/).filter(Boolean).length, [truncatedText]);

  useEffect(() => {
    function handleSelection() {
      const selection = window.getSelection();
      const rawText = selection?.toString().trim() ?? "";
      if (!selection || !rawText || rawText.length < 20) {
        setShowTooltip(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(rawText);
      setTooltipPosition({
        top: rect.top + window.scrollY - 48,
        left: rect.left + window.scrollX + rect.width / 2
      });
      setShowTooltip(true);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
        setShowTooltip(false);
      }
    }

    function handleOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }

    window.addEventListener("mouseup", handleSelection);
    window.addEventListener("touchend", handleSelection);
    window.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      window.removeEventListener("mouseup", handleSelection);
      window.removeEventListener("touchend", handleSelection);
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  async function applySimplification(nextLevel = level) {
    setLoading(true);
    try {
      if (selectedText.length > 1000) {
        toast("Large selection — only first 1000 characters will be simplified");
      }
      const response = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: truncatedText,
          topic,
          subject,
          level: nextLevel
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not simplify this section");
      }
      setResult({
        simplifiedText: data.simplifiedText,
        wordCount: data.wordCount
      });
      void triggerAchievementCheck("simplify_used");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not simplify this section");
    } finally {
      setLoading(false);
    }
  }

  function changeLevel(nextLevel: SimplifyLevel) {
    setLevel(nextLevel);
    if (!panelOpen || !result) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void applySimplification(nextLevel);
    }, 300);
  }

  async function addStickyNote() {
    if (!result?.simplifiedText) return;
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stickyNoteText: result.simplifiedText,
        stickyNoteColor: "yellow"
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? "Could not add sticky note");
      return;
    }
    toast.success("Added as sticky note!");
  }

  return (
    <>
      {showTooltip && !panelOpen ? (
        <button
          type="button"
          className="fixed z-[82] -translate-x-1/2 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--glass-shadow-deep)] backdrop-blur-xl"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
          onClick={() => {
            setPanelOpen(true);
            setShowTooltip(false);
            setResult(null);
            void applySimplification();
          }}
        >
          🔍 Simplify
        </button>
      ) : null}

      {panelOpen ? (
        <div
          ref={panelRef}
          className="fixed right-0 top-0 z-[84] h-screen w-full max-w-[360px] overflow-y-auto border-l border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] p-5 shadow-[var(--glass-shadow-deep)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">Simplify</p>
            <button
              type="button"
              className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-full"
              onClick={() => setPanelOpen(false)}
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="surface-card mt-4 rounded-[22px] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            “{selectedText.length > 200 ? `${selectedText.slice(0, 200)}...` : selectedText}”
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-[var(--foreground)]">Level</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {LEVELS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeLevel(item.value)}
                  className="text-center"
                >
                  <span
                    className={`mx-auto block h-4 w-4 rounded-full border-2 ${level === item.value ? "border-[#7B6CF6] bg-[#7B6CF6]" : "border-[color:var(--panel-border)] bg-transparent"}`}
                  />
                  <span className="mt-2 block text-[11px] text-[var(--muted-foreground)]">{item.label}</span>
                </button>
              ))}
            </div>
            <Button onClick={() => void applySimplification()} disabled={loading} className="mt-4 w-full">
              <IconSparkles className="mr-2 h-4 w-4" />
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>

          {result ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-full bg-[#7B6CF6]/12 px-3 py-1 text-xs font-semibold text-[#7B6CF6]">{level}</div>
              <div className="surface-card rounded-[22px] p-4 text-sm leading-7 text-[var(--foreground)]">{result.simplifiedText}</div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Original: {originalWordCount} words → Simplified: {result.wordCount} words
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={addStickyNote}>
                  <IconPin className="mr-2 h-4 w-4" />
                  Add as Sticky Note
                </Button>
                <Button variant="outline" onClick={() => setPanelOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
