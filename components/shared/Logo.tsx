import { StudyCompanion } from "@/components/companion/StudyCompanion";
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
      <div className={cn("flex items-start gap-3.5", className)}>
        <span className="surface-icon inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <StudyCompanion pose="wave" size={52} compact className="scale-[1.06]" />
        </span>
        <div className="space-y-1">
          <p
            className={cn(
              "font-headline text-[30px] leading-none tracking-[-0.03em] text-[var(--foreground)]",
              textClassName
            )}
          >
            StudyOS
          </p>
          <p
            className={cn(
              "max-w-[11rem] text-xs uppercase leading-[1.4] tracking-[0.16em] text-[var(--muted-foreground)]",
              subtitleClassName
            )}
          >
            Student Productivity Platform
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="surface-icon inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
        <StudyCompanion pose="sparkle" size={38} compact className="scale-[1.05]" />
      </span>
      <div>
        <p className={cn("font-headline text-base tracking-[-0.03em] text-[var(--foreground)]", textClassName)}>StudyOS</p>
        <p className={cn("text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]", subtitleClassName)}>Student Productivity Platform</p>
      </div>
    </div>
  );
}
