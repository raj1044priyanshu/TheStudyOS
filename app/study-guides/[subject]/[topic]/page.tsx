import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { getStudyGuide, getStudyGuides } from "@/lib/study-guides";
import { createBreadcrumbJsonLd, createFaqJsonLd, createWebPageJsonLd } from "@/lib/structured-data";

interface Params {
  params: {
    subject: string;
    topic: string;
  };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getStudyGuides().map((guide) => ({
    subject: guide.subjectSlug,
    topic: guide.topicSlug
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const guide = getStudyGuide(params.subject, params.topic);
  if (!guide) {
    return {};
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: guide.path
    },
    keywords: [guide.subject, guide.topic, `${guide.subject} study guide`, "revision guide"],
    robots: {
      index: guide.indexable,
      follow: guide.indexable
    }
  };
}

export default function StudyGuideDetailPage({ params }: Params) {
  const guide = getStudyGuide(params.subject, params.topic);
  if (!guide) {
    notFound();
  }

  const relatedGuides = getStudyGuides().filter((item) => item.subject === guide.subject && item.path !== guide.path).slice(0, 3);

  return (
    <>
      <StructuredData
        data={[
          createWebPageJsonLd({
            name: guide.title,
            description: guide.description,
            path: guide.path
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Study Guides", path: "/study-guides" },
            { name: guide.subject, path: guide.path },
            { name: guide.topic, path: guide.path }
          ]),
          createFaqJsonLd(guide.faqs)
        ]}
      />
      <main className="min-h-screen pb-12">
        <PublicSiteHeader />

        <article className="mx-auto max-w-5xl px-6 pb-16 pt-4">
          <div className="glass-card p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{guide.subject}</p>
            <h1 className="mt-3 font-headline text-[clamp(2.8rem,7vw,4.6rem)] tracking-[-0.05em] text-[var(--foreground)]">{guide.title}</h1>
            <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">{guide.description}</p>
            <p className="mt-5 rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
              {guide.intro}
            </p>
          </div>

          <section className="glass-card mt-6 rounded-[28px] p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Key takeaways</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {guide.keyTakeaways.map((takeaway) => (
                <div key={takeaway} className="surface-card rounded-[22px] p-5 text-sm leading-7 text-[var(--muted-foreground)]">
                  {takeaway}
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card mt-6 rounded-[28px] p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Revision breakdown</p>
            <div className="mt-6 space-y-5">
              {guide.sections.map((section) => (
                <div key={section.heading} className="rounded-[24px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-5">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{section.heading}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{section.content}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <section className="glass-card rounded-[28px] p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Practice checklist</p>
              <ul className="mt-5 space-y-3">
                {guide.practiceChecklist.map((item) => (
                  <li key={item} className="rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] px-4 py-3 text-sm leading-7 text-[var(--muted-foreground)]">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card rounded-[28px] p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Approved source handling</p>
              <div className="mt-5 space-y-3">
                {guide.approvedSources.map((source) => (
                  <div key={source.label} className="rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-4">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">{source.label}</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">{source.note}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="glass-card mt-6 rounded-[28px] p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">FAQ</p>
                <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)]">Questions students ask</h2>
              </div>
              <Link href="/resources" className="text-sm font-medium text-[#7B6CF6]">
                Explore more study resources
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {guide.faqs.map((faq) => (
                <div key={faq.question} className="surface-card rounded-[22px] p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {relatedGuides.length ? (
            <section className="glass-card mt-6 rounded-[28px] p-6 md:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Related guides</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {relatedGuides.map((relatedGuide) => (
                  <Link key={relatedGuide.path} href={relatedGuide.path} className="surface-card rounded-[22px] p-5 transition hover:-translate-y-1">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{relatedGuide.topic}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{relatedGuide.description}</p>
                  </Link>
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
