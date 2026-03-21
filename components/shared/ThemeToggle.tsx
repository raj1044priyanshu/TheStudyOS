"use client";

import { useEffect, useState } from "react";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme();
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

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <IconSun className="h-4 w-4" /> : <IconMoonStars className="h-4 w-4" />}
    </button>
  );
}
