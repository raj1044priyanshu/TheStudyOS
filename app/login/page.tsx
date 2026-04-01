import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { LoginButton } from "@/components/auth/LoginButton";
import { CompanionBadge, CompanionPanel } from "@/components/companion/StudyCompanion";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    await connectToDatabase();
    const user = await UserModel.findById(session.user.id).select("onboardingCompleted status").lean();
    if (user?.status === "suspended") {
      redirect("/suspended");
    }
    redirect(user?.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto flex max-w-6xl justify-end">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center justify-center py-6">
        <div className="grid w-full items-center gap-6 lg:grid-cols-[1fr_460px]">
          <div className="hidden space-y-6 lg:block">
            <Logo />
            <p className="glass-pill inline-flex px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              Focused study workspace
            </p>
            <div className="space-y-4">
              <h1 className="max-w-xl font-headline text-6xl leading-[0.95] tracking-[-0.03em] text-[var(--foreground)]">
                Step into a quieter, more focused study system.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--muted-foreground)]">
                Generate notes, solve doubts, build plans, revise with flashcards, and track real progress in a single premium workspace designed to feel calm from the first click.
              </p>
            </div>

            <CompanionPanel
              pose="wave"
              eyebrow="Welcome back"
              title="Your workspace is ready"
              description="The same visual system now carries through celebrations, helper panels, and the rest of StudyOS."
              compact
            />

            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["Notes", "Handwritten-style note generation with export-ready reading views."],
                ["Planner", "Structured study blocks tuned to your subjects and exam dates."],
                ["Progress", "XP, streaks, charts, and milestones from actual work."]
              ].map(([title, desc]) => (
                <div key={title} className="glass-card p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-modal w-full p-8 md:p-10">
            <Logo compact className="mb-5" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">Welcome</p>
                <h2 className="mt-3 font-headline text-5xl tracking-[-0.03em] text-[var(--foreground)]">Sign in</h2>
              </div>
              <CompanionBadge pose="wave" size={64} />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Continue with Google to open your study workspace, planner state, notes, and progress tracking.
            </p>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Included</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
                <li>Notes, quizzes, planner, flashcards, videos, and mind maps</li>
                <li>Search, notifications, reminders, and profile preferences</li>
                <li>Light mode by default with optional dark mode</li>
              </ul>
            </div>
            <LoginButton />
          </div>
        </div>
      </div>

      <footer className="mt-6 border-t border-[color:var(--panel-border)] py-4 text-sm text-[var(--muted-foreground)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4">
          <Link href="/">Home</Link>
          <span>•</span>
          <Link href="/login">Login</Link>
          <span>•</span>
          <span>Built for focused students</span>
        </div>
      </footer>
    </main>
  );
}
