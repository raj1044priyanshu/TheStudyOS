import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist or has been moved.",
  robots: {
    index: false,
    follow: false
  }
};

export default function NotFoundPage() {
  return (
    <main id="top" className="min-h-screen overflow-x-clip pb-10 sm:pb-12">
      <PublicSiteHeader />

      <section className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="glass-card max-w-lg p-8 sm:p-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
            Error 404
          </p>
          <h1 className="mt-4 font-headline text-[clamp(3rem,8vw,5rem)] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)]">
            Page not found
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
            The page you are looking for does not exist, has been moved, or is temporarily unavailable.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-[#7B6CF6] px-6 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#6958e0]"
            >
              Back to home
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[color:var(--surface-panel-strong)]"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
