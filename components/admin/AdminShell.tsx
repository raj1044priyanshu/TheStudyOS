"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  IconAlertTriangle,
  IconDatabase,
  IconDashboard,
  IconFileText,
  IconLogout,
  IconMessageCircle,
  IconSettings,
  IconShield,
  IconUsers
} from "@tabler/icons-react";
import { CompanionBadge } from "@/components/companion/StudyCompanion";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: IconDashboard },
  { href: "/admin/users", label: "Users", icon: IconUsers },
  { href: "/admin/resources", label: "Resources", icon: IconDatabase },
  { href: "/admin/feedback", label: "Feedback", icon: IconMessageCircle },
  { href: "/admin/errors", label: "Errors", icon: IconAlertTriangle },
  { href: "/admin/settings", label: "Settings", icon: IconSettings },
  { href: "/admin/ops", label: "Ops", icon: IconShield },
  { href: "/admin/audit", label: "Audit", icon: IconFileText }
];

interface Props {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AdminShell({ children, user }: Props) {
  const pathname = usePathname();

  return (
    <div className="app-shell-bg min-h-screen">
      <div className="mx-auto flex max-w-[1600px] gap-4 px-3 py-3 sm:px-4 md:px-6">
        <aside className="hidden w-[290px] shrink-0 lg:block">
          <div className="glass-card sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[32px] p-5">
            <Link href="/admin">
              <Logo className="px-1" textClassName="text-[34px]" subtitleClassName="max-w-[13rem]" />
            </Link>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Admin Control Plane</p>
              <CompanionBadge pose="thinking" size={52} className="shrink-0" />
            </div>
            <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-2">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm transition",
                      active
                        ? "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)] text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted-foreground)] hover:bg-[color:var(--nav-hover-bg)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-[16px]", active ? "surface-icon" : "surface-icon-muted")}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 pt-5">
              <Link href="/dashboard">
                <Button variant="secondary" className="w-full">
                  Back to workspace
                </Button>
              </Link>
              <div className="surface-card-strong rounded-[24px] p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={user.image} alt={user.name ?? "Admin"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{user.name ?? "Admin"}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{user.email ?? "Admin access"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="surface-icon-muted inline-flex h-10 w-10 items-center justify-center rounded-[16px]"
                    aria-label="Logout"
                  >
                    <IconLogout className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="glass-nav rounded-[30px] border border-[color:var(--panel-border)] px-4 py-4 lg:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                      active ? "bg-[color:var(--nav-active-bg)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="space-y-6 pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
