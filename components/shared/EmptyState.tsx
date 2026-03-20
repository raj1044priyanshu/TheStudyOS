import { Button } from "@/components/ui/button";
import { IconInbox } from "@tabler/icons-react";

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <div className="glass-card flex min-h-[220px] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="surface-icon inline-flex h-14 w-14 items-center justify-center rounded-full">
        <IconInbox className="h-5 w-5 text-[#7B6CF6]" />
      </div>
      <h3 className="font-headline text-[30px] tracking-[-0.02em] text-[var(--foreground)]">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
