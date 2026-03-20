import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Skeleton key={idx} className="h-28" />
      ))}
    </div>
  );
}
