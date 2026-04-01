export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--brand-500)] border-t-transparent" />
      <span>{text}</span>
    </div>
  );
}
