"use client";

import { useEffect, useState } from "react";
import { IconDeviceDesktop, IconMoonStars, IconSun } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]",
          className
        )}
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <IconMoonStars className="h-4 w-4" />
      </button>
    );
  }

  const activeTheme = theme ?? "system";
  const resolvedIsDark = resolvedTheme === "dark";
  const nextTheme = activeTheme === "system" ? "dark" : activeTheme === "dark" ? "light" : "system";
  const title =
    activeTheme === "system"
      ? "Following device theme. Switch to dark mode"
      : activeTheme === "dark"
        ? "Dark mode saved. Switch to light mode"
        : "Light mode saved. Follow device theme";

  const icon =
    activeTheme === "system" ? (
      <IconDeviceDesktop className="h-4 w-4" />
    ) : resolvedIsDark ? (
      <IconMoonStars className="h-4 w-4" />
    ) : (
      <IconSun className="h-4 w-4" />
    );

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]",
        className
      )}
      onClick={() => setTheme(nextTheme)}
      aria-label={title}
      title={title}
    >
      {icon}
    </button>
  );
}
