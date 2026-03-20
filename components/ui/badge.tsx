import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-pill inline-flex max-w-full items-center rounded-full px-3 py-1 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    />
  );
}
