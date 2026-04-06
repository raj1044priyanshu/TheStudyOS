import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { getContentEntries } from "@/lib/mdx-content";
import { createBreadcrumbJsonLd, createCollectionPageJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Blog",
  description: "Read StudyOS articles on integrated study workflows, revision loops, and sustainable student productivity.",
  alternates: {
    canonical: "/blog"
  }
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "long"
});

export default async function BlogPage() {
  const entries = await getContentEntries("blog");

  return (
    <>
      <StructuredData
        data={[
          createCollectionPageJsonLd({
            name: "StudyOS blog",
            description: "Articles about connected study workflows, revision, and sustainable student productivity.",
            path: "/blog"
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" }
          ])
        ]}
      />
      <main id="top" className="min-h-screen overflow-x-clip pb-10 sm:pb-12">
        <PublicSiteHeader />

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pt-4">
          <div className="glass-card p-5 sm:p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Blog</p>
            <h1 className="mt-3 font-headline text-[clamp(2.75rem,11vw,4.8rem)] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)]">Thoughtful systems for better student work.</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--muted-foreground)] sm:text-base sm:leading-8">
              The blog focuses on how students can plan better, revise more clearly, and keep momentum without getting buried in disconnected tools.
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
                <span className="mt-6 text-sm font-medium text-[#7B6CF6]">Read article</span>
              </Link>
            ))}
          </div>
        </section>

        <PublicSiteFooter />
      </main>
    </>
  );
}
