import { Skeleton } from "@/components/ui/skeleton";

export default function QuizAutopsyLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-52 rounded-[2rem]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
      <Skeleton className="h-40 rounded-[2rem]" />
    </div>
  );
}
