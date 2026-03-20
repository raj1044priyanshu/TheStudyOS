export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#7B6CF6]/80 border-t-transparent" />
      <span>{text}</span>
    </div>
  );
}
