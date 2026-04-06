"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconArrowLeft, IconFlame, IconTrophy } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { CompanionBadge } from "@/components/companion/StudyCompanion";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { HelpButton } from "@/components/help/HelpButton";
import { getTopbarMeta } from "@/lib/hubs";
import type { StudyStyle } from "@/types";

interface Props {
  streak: number;
  level: number;
  levelName: string;
  levelIcon: string;
  xp: number;
  progressToNextLevel: number;
  studyStyle?: StudyStyle | "";
  user: {
    name?: string | null;
    image?: string | null;
  };
}

export function Topbar({ streak, level, levelName, levelIcon, xp, progressToNextLevel, studyStyle, user }: Props) {
  const pathname = usePathname();
  const { title, eyebrow, breadcrumb } = getTopbarMeta(pathname);
  const levelLabel = `Lv ${level} ${levelName}`;

  return (
    <header className="sticky top-0 z-30 px-2 pt-2 sm:px-4 sm:pt-4 md:px-6">
      <div className="glass-nav mx-auto max-w-[1360px] rounded-[24px] border border-[color:var(--panel-border)] px-3 py-3 sm:rounded-[30px] sm:px-4 md:px-5 lg:px-6">
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,auto)] md:items-center">
          <div className="flex min-w-0 items-start justify-between gap-3 md:items-center">
            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
              {breadcrumb ? (
                <Link
                  href={breadcrumb.href}
                  className="hidden h-11 shrink-0 items-center gap-2 rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] px-4 text-sm font-medium text-[var(--foreground)] shadow-[var(--control-shadow)] sm:inline-flex"
                >
                  <IconArrowLeft className="h-4 w-4" />
                  {breadcrumb.label}
                </Link>
              ) : null}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tertiary-foreground)]">{eyebrow}</p>
                <p className="truncate font-headline text-[clamp(1.3rem,6vw,1.9rem)] tracking-[-0.03em] text-[var(--foreground)]">{title}</p>
              </div>
              <CompanionBadge
                pose={pathname.includes("/focus") ? "sleepy-focus" : pathname.includes("/plan") ? "thinking" : pathname.includes("/track") ? "sparkle" : "wave"}
                size={56}
                className="hidden lg:inline-flex"
              />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:hidden">
              <div
                id="streak-counter"
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-high)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]"
              >
                <IconFlame className="h-3.5 w-3.5 text-[#7B6CF6]" />
                {streak}
              </div>
              <NotificationBell className="h-10 w-10 rounded-full sm:h-11 sm:w-11" />
              <HelpButton studyStyle={studyStyle} className="hidden h-10 w-10 rounded-full min-[370px]:inline-flex sm:h-11 sm:w-11" />
              <Link
                href="/dashboard/profile"
                className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] p-0.5 shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] sm:h-11 sm:w-11"
              >
                <Avatar src={user.image} alt={user.name ?? "Student"} className="h-9 w-9 border-none shadow-none sm:h-10 sm:w-10" />
              </Link>
            </div>
          </div>

          <div className="hidden min-w-0 max-w-[860px] items-center justify-end gap-2.5 md:flex lg:gap-3">
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <Badge id="streak-counter" className="hidden h-11 gap-1.5 px-3 normal-case tracking-normal xl:inline-flex">
                <IconFlame className="h-3.5 w-3.5 text-[#7B6CF6]" />
                {streak}
              </Badge>
              <Badge className="h-11 max-w-[168px] gap-1.5 px-3 normal-case tracking-normal">
                {levelIcon ? <span className="text-[13px] leading-none">{levelIcon}</span> : <IconTrophy className="h-3.5 w-3.5 text-[#7B6CF6]" />}
                <span className="truncate">{levelLabel}</span>
              </Badge>
              <Badge className="hidden h-11 px-3 normal-case tracking-normal 2xl:inline-flex">{xp} XP</Badge>
            </div>
            <GlobalSearch
              className="relative min-w-[320px] flex-1 max-w-[480px] lg:min-w-[360px]"
              inputClassName="min-h-12 rounded-full border-[color:var(--control-border)] bg-[color:var(--surface-highest)] pl-11 pr-4 text-sm shadow-[var(--control-shadow)]"
            />
            <ThemeToggle className="h-12 w-12 shrink-0 rounded-full" />
            <NotificationBell className="h-12 w-12 shrink-0 rounded-full" />
            <HelpButton studyStyle={studyStyle} className="h-12 w-12 shrink-0 rounded-full" />
            <Link
              href="/dashboard/profile"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] p-0.5 shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)]"
            >
              <Avatar src={user.image} alt={user.name ?? "Student"} className="h-11 w-11 border-none shadow-none" />
            </Link>
          </div>
        </div>

        <div className="mt-2.5 md:hidden">
          <GlobalSearch
            className="relative w-full"
            inputClassName="min-h-11 rounded-full bg-[color:var(--surface-highest)] pl-11"
          />
        </div>
      </div>

      <div
        className="mx-auto mt-1 h-[1.5px] max-w-[1360px] overflow-hidden rounded-full opacity-55"
        style={{ background: "color-mix(in srgb, var(--surface-low) 72%, transparent)" }}
      >
        <div
          className="h-full rounded-full opacity-80 transition-[width] duration-300 brand-gradient"
          style={{ width: `${progressToNextLevel}%` }}
        />
      </div>
    </header>
  );
}
