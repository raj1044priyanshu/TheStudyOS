import Link from "next/link";
import {
  IconArrowUpRight,
  IconArrowRight,
  IconBook2,
  IconBrain,
  IconCalendarCheck,
  IconChartLine,
  IconHelpCircle,
  IconLayersIntersect,
  IconPlayerPlay,
  IconShieldCheck,
  IconSparkles,
  IconTopologyStar3
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";

const features = [
  { title: "Handwritten Notes", icon: IconBook2, desc: "Topper-style note generation with premium paper rendering and PDF export." },
  { title: "Doubt Solver", icon: IconHelpCircle, desc: "Chat-style tutor that explains step by step using your selected subject." },
  { title: "Smart Planner", icon: IconCalendarCheck, desc: "Date-aware schedules that prioritize exams and balance study load." },
  { title: "Quiz Generator", icon: IconBrain, desc: "MCQ quizzes with explanations, scoring, and performance tracking." },
  { title: "Flashcards", icon: IconLayersIntersect, desc: "Topic decks with flip animations and difficulty marking for revision." },
  { title: "Video Finder", icon: IconPlayerPlay, desc: "Educational YouTube discovery with quick filtering by duration." },
  { title: "Mind Maps", icon: IconTopologyStar3, desc: "Auto-generated concept maps you can drag, zoom, and export as PNG." },
  { title: "Progress", icon: IconChartLine, desc: "Real streak, XP, level, and achievement analytics from your own activity." }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-6 pt-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-4">
        <div className="grid items-start gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="animate-fade-up-soft space-y-6">
            <p className="glass-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--muted-foreground)]">
              <IconSparkles className="h-3.5 w-3.5 text-[#7B6CF6]" /> A calmer study workspace for serious students
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-headline text-5xl leading-[0.96] tracking-[-0.03em] text-[var(--foreground)] md:text-7xl">
                Calm, intelligent study flow for every subject.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                StudyOS brings notes, doubts, quizzes, planners, flashcards, mind maps, and progress into one quiet workspace so students can think clearly and move consistently.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Enter StudyOS <IconArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Explore the workflow
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Quiet surfaces", "Glass panels, restrained motion, and focused reading spaces."],
                ["Real progress", "Streaks, XP, quiz scores, and study time pulled from real activity."],
                ["One workspace", "Switch from notes to quizzes to planner without losing context."]
              ].map(([title, desc]) => (
                <div key={title} className="glass-card p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card animate-fade-up-soft p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Today in StudyOS</p>
                <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">A calmer control panel</h2>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#7B6CF6]/12 text-[#7B6CF6]">
                <IconArrowUpRight className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="surface-card-strong rounded-[24px] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Daily rhythm</p>
                    <p className="mt-2 font-headline text-4xl text-[#7B6CF6]">84%</p>
                  </div>
                  <div className="grid gap-2 text-right text-xs text-[var(--muted-foreground)]">
                    <span>Physics revision</span>
                    <span>Quiz practice</span>
                    <span>Mind map review</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {features.slice(0, 4).map((feature) => (
                  <div key={feature.title} className="surface-card rounded-[22px] p-4">
                    <div className="surface-icon mb-3 inline-flex rounded-full p-2">
                      <feature.icon className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="text-sm font-medium text-[var(--foreground)]">{feature.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-[color:var(--secondary-button-border)] bg-[color:var(--secondary-button-bg)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#7B6CF6]">Feature set</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {features.slice(4).map((feature) => (
                    <span key={feature.title} className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                      {feature.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Platform</p>
            <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Everything your study loop needs</h2>
          </div>
          <p className="hidden max-w-md text-sm leading-6 text-[var(--muted-foreground)] md:block">
            Built for students who want less clutter, better structure, and tools that feel integrated instead of bolted on.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="glass-card lift-3d p-5">
              <div className="mb-4 inline-flex rounded-full bg-[#7B6CF6]/10 p-2.5 text-[#7B6CF6]">
                <feature.icon className="h-[18px] w-[18px]" />
              </div>
              <h3 className="text-base font-medium text-[var(--foreground)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="glass-card grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Trust</p>
            <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Progress stays grounded in real work.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
              StudyOS is designed around actual student activity, not decorative dashboards. Notes, quizzes, planners, and revision all feed back into a single calm system.
            </p>
            <div className="surface-pill mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--muted-foreground)]">
              <IconShieldCheck className="h-4 w-4 text-[#7B6CF6]" />
              Real data. Real progress. One place.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Aarav", "The notes feel clean enough to study from immediately, not like auto-generated text dropped into a page."],
              ["Isha", "Planner, doubts, and quiz flow together without forcing me into five different tools."],
              ["Rahul", "The calmer design actually makes me open it more often and stay longer."]
            ].map(([name, text]) => (
              <div key={name} className="surface-card rounded-[22px] p-5">
                <p className="text-sm leading-6 text-[var(--foreground)]">{`"${text}"`}</p>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[color:var(--panel-border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-6">
          <Link href="/login">Login</Link>
          <span>•</span>
          <span>Built for focused students</span>
        </div>
      </footer>
    </main>
  );
}
