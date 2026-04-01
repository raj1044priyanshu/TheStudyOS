import { Button } from "@/components/ui/button";
import { IconInbox } from "@tabler/icons-react";
import { StudyCompanion } from "@/components/companion/StudyCompanion";

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <div className="glass-card relative flex min-h-[260px] flex-col items-center justify-center gap-4 overflow-hidden p-8 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--brand-300)_42%,transparent),transparent_72%)]" />
      <StudyCompanion pose="thinking" size={118} compact />
      <div className="surface-icon inline-flex h-14 w-14 items-center justify-center rounded-full">
        <IconInbox className="h-5 w-5 text-[color:var(--brand-500)]" />
      </div>
      <h3 className="font-headline text-[30px] tracking-[-0.02em] text-[var(--foreground)]">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
