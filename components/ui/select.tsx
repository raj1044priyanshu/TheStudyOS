import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "min-h-11 w-full appearance-none rounded-xl border border-[color:var(--outline-variant)] bg-[color:var(--control-bg)] px-4 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--field-shadow)] focus-visible:border-[color:var(--ring)] focus-visible:bg-[color:var(--control-hover-bg)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring-soft)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
