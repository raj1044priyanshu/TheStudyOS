import { cn } from "@/lib/utils";

interface Props {
  value: number;
  className?: string;
}

export function Progress({ value, className }: Props) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[color:var(--chart-grid)]", className)}>
      <div
        className="h-full rounded-full bg-[color:var(--primary)] transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
