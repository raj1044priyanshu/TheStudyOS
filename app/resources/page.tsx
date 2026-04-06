import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { getContentEntries } from "@/lib/mdx-content";
import { createBreadcrumbJsonLd, createCollectionPageJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Resources",
  description: "Read practical StudyOS resources on study planning, active recall, focus sessions, and revision workflows.",
  alternates: {
    canonical: "/resources"
  }
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "long"
});

export default async function ResourcesPage() {
  const entries = await getContentEntries("resources");

  return (
    <>
      <StructuredData
        data={[
          createCollectionPageJsonLd({
            name: "StudyOS resources",
            description: "Practical study resources for planning, focus, and revision.",
            path: "/resources"
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Resources", path: "/resources" }
          ])
        ]}
      />
      <main id="top" className="min-h-screen overflow-x-clip pb-10 sm:pb-12">
        <PublicSiteHeader />

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pt-4">
          <div className="glass-card p-5 sm:p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Resources</p>
            <h1 className="mt-3 font-headline text-[clamp(2.75rem,11vw,4.8rem)] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)]">Evergreen playbooks for studying well.</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--muted-foreground)] sm:text-base sm:leading-8">
              These guides focus on habits and systems students can actually repeat: planning, active recall, focus sessions, and calmer revision loops.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <Link key={entry.slug} href={entry.path} className="glass-card flex h-full flex-col rounded-[26px] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(123,108,246,0.14)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.12em] text-[var(--tertiary-foreground)]">
                  <span>{dateFormatter.format(new Date(entry.publishedAt))}</span>
                  <span>{entry.readingTime}</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{entry.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{entry.excerpt}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="mt-6 text-sm font-medium text-[#7B6CF6]">Read resource</span>
              </Link>
            ))}
          </div>
        </section>

        <PublicSiteFooter />
      </main>
    </>
  );
}
