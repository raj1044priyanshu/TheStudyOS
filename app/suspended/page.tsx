import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

export default function SuspendedPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl glass-card p-8">
        <Logo compact />
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Account Status</p>
        <h1 className="mt-3 font-headline text-5xl tracking-[-0.03em] text-[var(--foreground)]">This account is suspended.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
          Access to the student workspace is currently disabled. If this looks incorrect, contact the StudyOS admin.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
