"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  IconLogout,
  IconSparkles
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/Logo";
import { APP_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface Props {
  user: {
    name?: string | null;
    image?: string | null;
  };
}

export function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const isNoteViewer = pathname.startsWith("/notes/");
  const coreItems = APP_NAV_ITEMS.slice(0, 5);
  const studyItems = APP_NAV_ITEMS.slice(5);

  if (isNoteViewer) {
    return null;
  }

  function renderNavGroup(label: string, items: typeof APP_NAV_ITEMS) {
    return (
      <div className="space-y-2.5">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tertiary-foreground)]">{label}</p>
        <nav className="space-y-1.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                data-tour-id={item.tourId}
                className={cn(
                  "group flex min-h-[52px] items-center gap-3 rounded-[20px] border px-3.5 py-2.5 text-sm transition-all duration-150",
                  active
                    ? "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)] text-[var(--foreground)] shadow-[0_18px_32px_rgba(123,108,246,0.12),inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:border-[color:var(--panel-border)] hover:bg-[color:var(--nav-hover-bg)] hover:text-[var(--foreground)]"
                )}
              >
                <span
                  className={cn(
                    "h-8 w-1.5 rounded-full transition-all",
                    active ? "bg-[#7B6CF6] shadow-[0_0_18px_rgba(123,108,246,0.42)]" : "bg-transparent group-hover:bg-[#7B6CF6]/20"
                  )}
                />
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-[14px] border transition-all",
                    active
                      ? "surface-icon border-[color:var(--secondary-button-border)]"
                      : "surface-icon-muted border-transparent group-hover:border-[color:var(--panel-border)] group-hover:text-[var(--nav-icon-fg)]"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <span className={cn("font-medium tracking-[-0.01em]", active && "font-semibold text-[var(--foreground)]")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 px-4 py-4 md:flex">
      <div className="glass-card flex h-[calc(100dvh-2rem)] min-h-0 w-full flex-col px-4 py-4">
        <Logo className="mb-6 px-1.5" textClassName="text-[34px]" subtitleClassName="text-[10px] tracking-[0.24em]" />

        <div className="surface-card rounded-[22px] p-3.5">
          <div className="flex items-center gap-3">
            <span className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-[16px]">
              <IconSparkles className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">Study mode is active</p>
              <p className="text-[11px] leading-4 text-[var(--muted-foreground)]">Soft focus, calmer contrast, less clutter.</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-5 scrollbar-thin">
          {renderNavGroup("Core", coreItems)}
          <div className="h-5" />
          {renderNavGroup("Study Tools", studyItems)}
        </div>

        <div className="mt-auto pt-4">
          <div className="surface-card-strong rounded-[24px] p-3.5">
            <div className="flex items-center gap-3">
              <Avatar src={user.image} alt={user.name ?? "Student"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{user.name ?? "Student"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Focused workspace</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="surface-icon-muted inline-flex h-10 w-10 items-center justify-center rounded-[16px] transition hover:text-[var(--foreground)]"
                aria-label="Logout"
                title="Logout"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
