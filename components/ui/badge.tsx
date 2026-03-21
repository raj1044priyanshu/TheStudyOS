import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-pill inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    />
  );
}
