import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{eyebrow}</p>
        <h1 className="mt-2 font-headline text-[clamp(2rem,5vw,3rem)] tracking-[-0.04em] text-[var(--foreground)]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("glass-card rounded-[28px] p-5 md:p-6", className)}>{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <AdminCard className="surface-card-hover">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{label}</p>
      <p className="mt-3 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)]">{value}</p>
      {helper ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">{helper}</p> : null}
    </AdminCard>
  );
}

export function AdminEmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <AdminCard className="text-center">
      <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </AdminCard>
  );
}

export function AdminJsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-4 text-xs leading-6 text-[var(--muted-foreground)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
