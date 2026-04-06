import Link from "next/link";
import { StudyCompanion } from "@/components/companion/StudyCompanion";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  textClassName?: string;
  subtitleClassName?: string;
  compact?: boolean;
  href?: string;
}

export function Logo({ className, textClassName, subtitleClassName, compact = false, href }: Props) {
  const content = !compact ? (
    <div className={cn("flex items-start gap-3.5", className)}>
      <span className="surface-icon inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <StudyCompanion pose="wave" size={52} compact className="scale-[1.03]" />
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
  ) : (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="surface-icon inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <StudyCompanion pose="sparkle" size={38} compact className="scale-[1.02]" />
      </span>
      <div className="min-w-0">
        <p className={cn("truncate font-headline text-base tracking-[-0.03em] text-[var(--foreground)]", textClassName)}>StudyOS</p>
        <p className={cn("hidden text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)] sm:block md:hidden", subtitleClassName)}>
          Student Platform
        </p>
        <p className={cn("hidden text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)] md:block", subtitleClassName)}>
          Student Productivity Platform
        </p>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
