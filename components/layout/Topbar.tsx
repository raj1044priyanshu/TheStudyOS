"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { IconArrowLeft, IconSparkles } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

interface Props {
  streak: number;
  level: number;
  levelName: string;
  levelIcon: string;
  xp: number;
  progressToNextLevel: number;
  user: {
    name?: string | null;
    image?: string | null;
  };
}

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/notes") return "Notes";
  if (pathname.startsWith("/notes/")) return "Note";
  if (pathname === "/doubts") return "Doubt Solver";
  if (pathname === "/planner") return "Study Planner";
  if (pathname === "/quiz") return "Quiz";
  if (pathname.startsWith("/quiz/")) return "Quiz Session";
  if (pathname === "/flashcards") return "Flashcards";
  if (pathname === "/focus") return "Focus Room";
  if (pathname === "/scanner") return "Scanner";
  if (pathname === "/knowledge-graph") return "Knowledge Graph";
  if (pathname === "/formula-sheet") return "Formula Sheet";
  if (pathname === "/exams") return "Exams";
  if (pathname === "/teach-me") return "Teach Me";
  if (pathname === "/revision") return "Revision";
  if (pathname === "/study-room") return "Study Room";
  if (pathname === "/evaluator") return "Evaluator";
  if (pathname === "/past-papers") return "Past Papers";
  if (pathname === "/mindmap") return "Mind Map";
  if (pathname === "/progress") return "Progress";
  if (pathname === "/videos") return "Videos";
  if (pathname === "/profile") return "Profile";
  return "StudyOS";
}

function getPageEyebrow(pathname: string) {
  if (pathname === "/dashboard") return "Workspace";
  if (pathname.startsWith("/notes")) return "Library";
  if (pathname.startsWith("/quiz")) return "Assessment";
  if (pathname === "/planner") return "Planning";
  if (pathname === "/doubts") return "Assistant";
  if (pathname === "/focus") return "Focus";
  if (pathname === "/scanner") return "Capture";
  if (pathname === "/knowledge-graph") return "Connections";
  if (pathname === "/formula-sheet") return "Collection";
  if (pathname === "/exams") return "Countdown";
  if (pathname === "/teach-me") return "Feynman";
  if (pathname === "/revision") return "Spaced Repetition";
  if (pathname === "/study-room") return "Collaboration";
  if (pathname === "/evaluator") return "Exam Practice";
  if (pathname === "/past-papers") return "Analysis";
  if (pathname === "/progress") return "Insights";
  return "StudyOS";
}

export function Topbar({ streak, level, levelName, levelIcon, xp, progressToNextLevel, user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const eyebrow = getPageEyebrow(pathname);
  const isNoteViewer = pathname.startsWith("/notes/");
  const showBack = pathname !== "/dashboard" && pathname !== "/notes" && pathname !== "/doubts" && pathname !== "/quiz";
  const showDesktopStats = pathname !== "/dashboard";

  if (isNoteViewer) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-6">
      <div className="glass-nav mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-4 rounded-[26px] border border-[color:var(--panel-border)] px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] md:hidden ${showBack ? "" : "invisible"}`}
            aria-label="Go back"
          >
            <IconArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tertiary-foreground)]">{eyebrow}</p>
            <p className="truncate font-headline text-[24px] tracking-[-0.03em] text-[var(--foreground)]">{title}</p>
          </div>
          {showDesktopStats ? (
            <div className="hidden items-center gap-2 xl:flex">
              <Badge className="gap-1.5 normal-case tracking-normal">
                <IconSparkles className="h-3.5 w-3.5 text-[#7B6CF6]" />
                🔥 {streak}
              </Badge>
              <Badge className="normal-case tracking-normal">
                {levelIcon} {levelName}
              </Badge>
              <Badge className="normal-case tracking-normal">{xp} XP</Badge>
            </div>
          ) : null}
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex lg:gap-4">
          <GlobalSearch
            className="relative w-full max-w-[360px] xl:max-w-[420px]"
            inputClassName="min-h-12 rounded-[18px] bg-[color:var(--surface-highest)] pl-11"
          />
          <ThemeToggle className="h-12 w-12 rounded-[16px]" />
          <NotificationBell className="h-12 w-12 rounded-[16px]" />
          <Link href="/profile" className="surface-icon inline-flex h-12 w-12 items-center justify-center rounded-[16px] p-1">
            <Avatar src={user.image} alt={user.name ?? "Student"} />
          </Link>
        </div>

      <div className="flex items-center gap-2 md:hidden">
          <Link href="/profile">
            <Avatar src={user.image} alt={user.name ?? "Student"} />
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-2 h-[5px] max-w-[1320px] overflow-hidden rounded-full bg-[color:var(--surface-low)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#7B6CF6,#6EE7B7)] transition-[width] duration-300"
          style={{ width: `${progressToNextLevel}%` }}
        />
      </div>
    </header>
  );
}
