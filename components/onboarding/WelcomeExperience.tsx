"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  IconArrowRight,
  IconBook2,
  IconBrain,
  IconHelpCircle,
  IconSparkles,
  IconStars
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

interface Props {
  name: string;
}

const highlights = [
  {
    title: "Teacher-like explanations",
    description: "Shorter doubt answers, cleaner structure, and examples that feel explained instead of dumped.",
    icon: IconHelpCircle
  },
  {
    title: "Beautiful study outputs",
    description: "Generate note-style explanations, quizzes, and plans inside one darker, calmer workspace.",
    icon: IconBook2
  },
  {
    title: "Momentum from day one",
    description: "The guided tour will walk you through the exact tools most students use first.",
    icon: IconBrain
  }
] as const;

export function WelcomeExperience({ name }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const firstName = name.trim().split(/\s+/)[0] || name;

  async function begin() {
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH"
      });

      if (!response.ok) {
        throw new Error("Could not open your workspace yet");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open your workspace yet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-[#080610] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(154,140,255,0.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(122,215,178,0.12),transparent_24%),linear-gradient(180deg,#090711_0%,#0d0b16_52%,#07050d_100%)]" />
      <div className="pointer-events-none absolute -left-16 top-12 h-48 w-48 rounded-full bg-[#9A8CFF]/16 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 right-0 h-64 w-64 rounded-full bg-[#7AD7B2]/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Logo compact textClassName="text-white" subtitleClassName="text-[#A69CBD]" />
          <span className="glass-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#D9D2FF]">
            <IconSparkles className="h-3.5 w-3.5 text-[#9A8CFF]" />
            First-time setup
          </span>
        </div>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="space-y-6">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#B9B0D4]">
                <IconStars className="h-3.5 w-3.5 text-[#9A8CFF]" />
                Welcome flow
              </p>
              <h1 className="max-w-3xl font-headline text-5xl leading-[0.94] tracking-[-0.045em] text-white md:text-7xl">
                {firstName}, your study workspace is ready.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#C2B9DB] md:text-lg">
                We&apos;ve made the first run feel calmer: a darker onboarding screen, a focused guided tour, and clearer explanations that read more like a real teacher.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {highlights.map((item) => (
                <article key={item.title} className="glass-card rounded-[26px] border-white/10 bg-white/[0.06] p-4">
                  <span className="surface-icon mb-4 inline-flex rounded-full p-2.5">
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#AEA5C8]">{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-modal rounded-[34px] border-white/10 bg-[linear-gradient(180deg,rgba(24,19,37,0.94)_0%,rgba(16,13,26,0.98)_100%)] p-6 shadow-[0_32px_90px_rgba(2,2,10,0.48)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9E95BC]">What happens next</p>
                <h2 className="mt-3 font-headline text-4xl tracking-[-0.04em] text-white">A guided first run</h2>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#9A8CFF]/14 text-[#DAD4FF]">
                <IconArrowRight className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {[
                "Open the tour and highlight the exact surfaces you should use first.",
                "Walk through notes, quizzes, planner, doubts, and the rest of the dashboard flow.",
                "Keep the rest of the app softly blurred so the next action is always obvious."
              ].map((line, index) => (
                <div key={line} className="surface-card rounded-[24px] border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9A8CFF]/18 text-sm font-semibold text-[#E4DEFF]">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-[#C9C1E2]">{line}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-[#9A8CFF]/18 bg-[linear-gradient(135deg,rgba(154,140,255,0.16),rgba(122,215,178,0.08))] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#DAD3FF]">Focus mode</p>
              <p className="mt-3 text-sm leading-6 text-[#E6E0F7]">
                Doubt answers will be shorter, prettier, and easier to revise. Emails now match the same darker StudyOS look.
              </p>
            </div>

            <Button size="lg" className="mt-7 w-full justify-between" onClick={begin} disabled={loading}>
              <span>{loading ? "Opening your workspace..." : "Enter dashboard and start the tour"}</span>
              <IconArrowRight className="h-4 w-4" />
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
