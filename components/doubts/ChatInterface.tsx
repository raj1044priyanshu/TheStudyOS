"use client";

import { useState } from "react";
import {
  IconBookmark,
  IconMessageCircle,
  IconPencil,
  IconRotateClockwise2,
  IconSend,
  IconSparkles
} from "@tabler/icons-react";
import { useDoubts } from "@/hooks/useDoubts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SUBJECTS, SUBJECT_COLOR_VALUES } from "@/lib/constants";

function parseTutorSections(content: string) {
  const normalized = content.replace(/\r/g, "");
  const matches = [...normalized.matchAll(/(^|\n)(Quick idea|Solved example|Remember)\s*:?\s*/gim)];

  if (matches.length === 0) {
    return [];
  }

  return matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = index + 1 < matches.length ? (matches[index + 1].index ?? normalized.length) : normalized.length;
      return {
        title: match[2],
        body: normalized.slice(start, end).trim()
      };
    })
    .filter((section) => section.body.length > 0);
}

function splitSolvedExample(body: string) {
  return body
    .replace(/\s(?=\d+\.\s)/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s*/, ""));
}

function sectionAccent(section: string) {
  if (section === "Solved example") {
    return {
      icon: IconPencil,
      tint: "bg-[#9A8CFF]/12 text-[#6B5DD3] dark:bg-[#9A8CFF]/18 dark:text-[#DDD6FF]"
    };
  }

  if (section === "Remember") {
    return {
      icon: IconBookmark,
      tint: "bg-[#7AD7B2]/14 text-[#12715E] dark:bg-[#7AD7B2]/16 dark:text-[#BDF4DE]"
    };
  }

  return {
    icon: IconSparkles,
    tint: "bg-[#FCD34D]/18 text-[#9A6700] dark:bg-[#FCD34D]/16 dark:text-[#FDE68A]"
  };
}

function TutorReplyCard({ content, subject }: { content: string; subject: string }) {
  const sections = parseTutorSections(content);
  const paragraphs = content
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
  const subjectColor = SUBJECT_COLOR_VALUES[subject] ?? SUBJECT_COLOR_VALUES.Other;

  return (
    <article
      className="note-surface overflow-hidden rounded-[26px] p-0 text-[var(--note-foreground)]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,253,247,0.98) 100%), repeating-linear-gradient(180deg, transparent 0, transparent 30px, rgba(186,198,220,0.3) 30px, rgba(186,198,220,0.3) 31px)"
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--note-border)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{
              backgroundColor: `${subjectColor}18`,
              borderColor: `${subjectColor}55`,
              color: subjectColor
            }}
          >
            {subject}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--note-border)] bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--note-muted-foreground)]">
            <IconSparkles className="h-3.5 w-3.5" />
            Teacher mode
          </span>
        </div>
        <p className="note-font-caveat text-[1.45rem] leading-none text-[var(--note-muted-foreground)]">Explained for quick revision</p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {sections.length > 0
          ? sections.map((section) => {
              const accent = sectionAccent(section.title);
              const SectionIcon = accent.icon;
              const solvedSteps = section.title === "Solved example" ? splitSolvedExample(section.body) : [];

              return (
                <section key={section.title} className="rounded-[22px] border border-[color:var(--note-border)] bg-white/72 p-4 shadow-[0_8px_24px_rgba(20,32,51,0.06)]">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${accent.tint}`}>
                      <SectionIcon className="h-4 w-4" />
                    </span>
                    <h3 className="note-font-caveat text-[1.6rem] leading-none text-[var(--note-foreground)]">{section.title}</h3>
                  </div>

                  {section.title === "Solved example" && solvedSteps.length > 0 ? (
                    <ol className="space-y-3">
                      {solvedSteps.map((step, index) => (
                        <li key={`${section.title}-${index}`} className="flex gap-3">
                          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--note-foreground)] text-xs font-semibold text-white">
                            {index + 1}
                          </span>
                          <p className="text-sm leading-7 text-[var(--note-foreground)]">{step}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="space-y-3">
                      {section.body.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={`${section.title}-${index}`} className="whitespace-pre-line text-sm leading-7 text-[var(--note-foreground)]">
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          : paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm leading-7 text-[var(--note-foreground)]">
                {paragraph}
              </p>
            ))}
      </div>
    </article>
  );
}

export function ChatInterface() {
  const [subject, setSubject] = useState("Mathematics");
  const [message, setMessage] = useState("");
  const { messages, loading, ask, reset } = useDoubts(subject);

  async function submit() {
    if (!message.trim()) return;
    const value = message;
    setMessage("");
    await ask(value);
    window.dispatchEvent(new CustomEvent("tour:doubt-sent"));
  }

  function useExampleDoubt() {
    setSubject("Mathematics");
    setMessage("Can you explain the chain rule with one solved example?");
  }

  return (
    <div className="grid gap-4">
      <div className="glass-card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Select className="max-w-xs" value={subject} onChange={(event) => setSubject(event.target.value)}>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={reset} className="gap-2">
            <IconRotateClockwise2 className="h-3.5 w-3.5" />
            New Session
          </Button>
        </div>
        <div className="mb-3">
          <Button data-tour-id="doubts-example-fill" type="button" variant="ghost" size="sm" onClick={useExampleDoubt}>
            Use Example
          </Button>
        </div>

        <div className="surface-card relative min-h-[56dvh] rounded-[28px] p-4">
          <div className="absolute left-4 top-4">
            <span className="glass-pill inline-flex px-3 py-1 text-xs font-medium text-[#7B6CF6]">{subject}</span>
          </div>

          <div className="scrollbar-thin mt-10 h-[44dvh] min-h-[280px] space-y-4 overflow-y-auto pr-1 sm:h-[430px]">
            {messages.length === 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Explain the chain rule with one solved example.",
                  "Summarize Newton's laws in a simple way.",
                  "What is the difference between mitosis and meiosis?",
                  "Give me a quick revision of the French Revolution."
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setMessage(suggestion)}
                    className="surface-card surface-card-hover rounded-[18px] p-4 text-left text-sm leading-6 text-[var(--muted-foreground)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[82%] px-4 py-3 text-sm leading-6 ${
                    msg.role === "user"
                      ? "[border-radius:18px_18px_4px_18px] bg-[#7B6CF6] text-white shadow-[0_10px_24px_rgba(123,108,246,0.24)]"
                      : "w-full max-w-[min(100%,48rem)]"
                  }`}
                >
                  {msg.role === "user" ? msg.content : <TutorReplyCard content={msg.content} subject={subject} />}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="[border-radius:18px_18px_18px_4px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel-strong)] px-4 py-3 shadow-[var(--panel-shadow)]">
                  <div className="flex items-center gap-2 text-[#7B6CF6]">
                    <IconMessageCircle className="h-4 w-4" />
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:140ms]" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-current [animation-delay:280ms]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="surface-card mt-4 flex gap-2 rounded-full p-2 pl-3">
          <Input
            data-tour-id="doubts-input"
            value={message}
            placeholder="Ask your tutor..."
            className="border-0 bg-transparent shadow-none focus-visible:bg-transparent"
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
          />
          <Button data-tour-id="doubts-send" onClick={submit} disabled={loading} className="gap-1.5">
            <IconSend className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
