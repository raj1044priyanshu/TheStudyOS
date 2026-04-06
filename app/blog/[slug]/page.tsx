import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { getContentEntries, getContentEntry, renderMdxContent } from "@/lib/mdx-content";
import { createArticleJsonLd, createBreadcrumbJsonLd, createFaqJsonLd } from "@/lib/structured-data";

interface Params {
  params: {
    slug: string;
  };
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "long"
});

export const dynamicParams = false;

export async function generateStaticParams() {
  const entries = await getContentEntries("blog");
  return entries.map((entry) => ({
    slug: entry.slug
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = await getContentEntry("blog", params.slug);
  if (!entry) {
    return {};
  }

  return {
    title: entry.title,
    description: entry.description,
    alternates: {
      canonical: entry.path
    }
  };
}

export default async function BlogDetailPage({ params }: Params) {
  const entry = await getContentEntry("blog", params.slug);
  if (!entry) {
    notFound();
  }

  const structuredData = [
    createArticleJsonLd({
      title: entry.title,
      description: entry.description,
      path: entry.path,
      publishedAt: entry.publishedAt,
      updatedAt: entry.updatedAt,
      author: entry.author
    }),
    createBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: entry.title, path: entry.path }
    ]),
    ...(entry.faqs.length ? [createFaqJsonLd(entry.faqs)] : [])
  ];

  return (
    <>
      <StructuredData data={structuredData} />
      <main className="min-h-screen pb-12">
        <PublicSiteHeader />

        <article className="mx-auto max-w-4xl px-6 pb-16 pt-4">
          <div className="glass-card p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Article</p>
            <h1 className="mt-3 font-headline text-[clamp(2.8rem,7vw,4.6rem)] tracking-[-0.05em] text-[var(--foreground)]">{entry.title}</h1>
            <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">{entry.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
              <span>{dateFormatter.format(new Date(entry.publishedAt))}</span>
              <span>•</span>
              <span>{entry.readingTime}</span>
              <span>•</span>
              <span>{entry.author ?? "StudyOS Editorial Team"}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card mt-6 rounded-[28px] p-6 md:p-8">{renderMdxContent(entry.content)}</div>

          {entry.faqs.length ? (
            <section className="glass-card mt-6 rounded-[28px] p-6 md:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">FAQ</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {entry.faqs.map((faq) => (
                  <div key={faq.question} className="surface-card rounded-[22px] p-5">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">{faq.question}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <PublicSiteFooter />
      </main>
    </>
  );
}
