import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <Skeleton key={idx} className="h-28" />
      ))}
    </div>
  );
}
