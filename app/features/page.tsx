import type { Metadata } from "next";
import Link from "next/link";
import { FEATURE_PAGES } from "@/content/features";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { createBreadcrumbJsonLd, createCollectionPageJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore StudyOS features for notes, quizzes, planners, flashcards, mind maps, and focused student progress.",
  alternates: {
    canonical: "/features"
  }
};

export default function FeaturesPage() {
  return (
    <>
      <StructuredData
        data={[
          createCollectionPageJsonLd({
            name: "StudyOS features",
            description: "Explore the product surfaces that connect planning, learning, and revision in StudyOS.",
            path: "/features"
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" }
          ])
        ]}
      />
      <main id="top" className="min-h-screen overflow-x-clip pb-10 sm:pb-12">
        <PublicSiteHeader />

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pt-4">
          <div className="glass-card p-5 sm:p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">StudyOS features</p>
            <h1 className="mt-3 font-headline text-[clamp(2.75rem,11vw,4.8rem)] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)]">
              One study system, several focused tools.
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--muted-foreground)] sm:text-base sm:leading-8">
              StudyOS is built for students who want their notes, planning, quizzes, and revision workflows to support each other instead of living in separate tabs.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURE_PAGES.map((feature) => (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                className="glass-card flex h-full flex-col rounded-[26px] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(123,108,246,0.14)]"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{feature.shortTitle}</p>
                <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{feature.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {feature.highlights.map((highlight) => (
                    <span key={highlight} className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                      {highlight}
                    </span>
                  ))}
                </div>
                <span className="mt-6 text-sm font-medium text-[#7B6CF6]">Read feature details</span>
              </Link>
            ))}
          </div>
        </section>

        <PublicSiteFooter />
      </main>
    </>
  );
}
