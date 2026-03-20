import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  textClassName?: string;
  subtitleClassName?: string;
  compact?: boolean;
}

export function Logo({ className, textClassName, subtitleClassName, compact = false }: Props) {
  if (!compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className="surface-icon inline-flex h-11 w-11 items-center justify-center rounded-full font-headline text-2xl">
          ✦
        </span>
        <div>
          <p
            className={cn(
              "font-headline text-[30px] leading-none tracking-[-0.03em] text-[var(--foreground)]",
              textClassName
            )}
          >
            StudyOS
          </p>
          <p className={cn("text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]", subtitleClassName)}>Student Productivity Platform</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="surface-icon inline-flex h-9 w-9 items-center justify-center rounded-full font-headline text-xl">
        ✦
      </span>
      <div>
        <p className={cn("font-headline text-base tracking-[-0.03em] text-[var(--foreground)]", textClassName)}>StudyOS</p>
        <p className={cn("text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]", subtitleClassName)}>Student Productivity Platform</p>
      </div>
    </div>
  );
}
