import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--panel-border)] bg-[linear-gradient(110deg,color-mix(in_srgb,var(--surface-panel)_92%,transparent),color-mix(in_srgb,var(--surface-panel-hover)_98%,transparent),color-mix(in_srgb,var(--surface-panel)_92%,transparent))] bg-[length:200%_100%] animate-shimmer-x",
        className
      )}
    />
  );
}
