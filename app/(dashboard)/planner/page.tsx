import { PlannerView } from "@/components/planner/PlannerView";

export default function PlannerPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Schedule</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Study Planner</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Build a calmer weekly study grid around your exam dates, priorities, and daily hours.
        </p>
      </div>
      <PlannerView />
    </div>
  );
}
