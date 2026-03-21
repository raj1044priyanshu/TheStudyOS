"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { IconLogout, IconShield } from "@tabler/icons-react";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { getHubNavKey, HUB_NAV_ITEMS } from "@/lib/hubs";
import { cn } from "@/lib/utils";

interface Props {
  user: {
    name?: string | null;
    image?: string | null;
  };
  isAdmin?: boolean;
}

export function Sidebar({ user, isAdmin = false }: Props) {
  const pathname = usePathname();
  const activeKey = useMemo(() => getHubNavKey(pathname), [pathname]);

  return (
    <aside id="sidebar" className="sticky top-0 hidden h-screen w-[280px] shrink-0 px-4 py-4 md:flex">
      <div className="glass-card flex h-[calc(100dvh-2rem)] min-h-0 w-full flex-col px-4 py-5">
        <Logo
          className="mb-8 px-2"
          textClassName="text-[38px]"
          subtitleClassName="max-w-[10.5rem] text-[10px] leading-[1.45] tracking-[0.22em]"
        />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-4 scrollbar-thin">
          <nav className="space-y-2">
            {HUB_NAV_ITEMS.slice(0, 1).map((item) => {
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-[56px] items-center gap-3.5 rounded-[20px] border px-4 py-3 text-sm transition-all duration-150",
                    active
                      ? "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)] text-[var(--foreground)] shadow-[0_18px_32px_rgba(123,108,246,0.12),inset_0_1px_0_rgba(255,255,255,0.16)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:bg-[color:var(--nav-hover-bg)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className={cn("h-8 w-1.5 rounded-full", active ? "bg-[#7B6CF6] shadow-[0_0_18px_rgba(123,108,246,0.42)]" : "bg-transparent")} />
                  <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-[14px]", active ? "surface-icon" : "surface-icon-muted")}>
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={cn("font-medium tracking-[-0.01em]", active && "font-semibold text-[var(--foreground)]")}>{item.label}</span>
                </Link>
              );
            })}

            <div className="my-3 h-px rounded-full bg-[color:var(--panel-border)]" />

            {HUB_NAV_ITEMS.slice(1, 6).map((item) => {
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-[56px] items-center gap-3.5 rounded-[20px] border px-4 py-3 text-sm transition-all duration-150",
                    active
                      ? "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)] text-[var(--foreground)] shadow-[0_18px_32px_rgba(123,108,246,0.12),inset_0_1px_0_rgba(255,255,255,0.16)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:bg-[color:var(--nav-hover-bg)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className={cn("h-8 w-1.5 rounded-full", active ? "bg-[#7B6CF6] shadow-[0_0_18px_rgba(123,108,246,0.42)]" : "bg-transparent")} />
                  <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-[14px]", active ? "surface-icon" : "surface-icon-muted")}>
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={cn("block font-medium tracking-[-0.01em]", active && "font-semibold text-[var(--foreground)]")}>{item.label}</span>
                  </div>
                </Link>
              );
            })}

            <div className="my-3 h-px rounded-full bg-[color:var(--panel-border)]" />

            {HUB_NAV_ITEMS.slice(6).map((item) => {
              const active = activeKey === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-[56px] items-center gap-3.5 rounded-[20px] border px-4 py-3 text-sm transition-all duration-150",
                    active
                      ? "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)] text-[var(--foreground)] shadow-[0_18px_32px_rgba(123,108,246,0.12),inset_0_1px_0_rgba(255,255,255,0.16)]"
                      : "border-transparent text-[var(--muted-foreground)] hover:bg-[color:var(--nav-hover-bg)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className={cn("h-8 w-1.5 rounded-full", active ? "bg-[#7B6CF6] shadow-[0_0_18px_rgba(123,108,246,0.42)]" : "bg-transparent")} />
                  <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-[14px]", active ? "surface-icon" : "surface-icon-muted")}>
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={cn("font-medium tracking-[-0.01em]", active && "font-semibold text-[var(--foreground)]")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-4">
          {isAdmin ? (
            <Link href="/admin" className="mb-3 block">
              <Button variant="secondary" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <IconShield className="h-4 w-4" />
                  Admin control
                </span>
                <span className="text-xs uppercase tracking-[0.14em]">Open</span>
              </Button>
            </Link>
          ) : null}
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
