import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { getStudyGuides } from "@/lib/study-guides";
import { createBreadcrumbJsonLd, createCollectionPageJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Study Guides",
  description: "Browse classroom-safe StudyOS study guides for core topics across biology, physics, chemistry, and mathematics.",
  alternates: {
    canonical: "/study-guides"
  }
};

export default function StudyGuidesPage() {
  const guides = getStudyGuides();
  const grouped = guides.reduce<Record<string, typeof guides>>((accumulator, guide) => {
    accumulator[guide.subject] ??= [];
    accumulator[guide.subject].push(guide);
    return accumulator;
  }, {});

  return (
    <>
      <StructuredData
        data={[
          createCollectionPageJsonLd({
            name: "StudyOS study guides",
            description: "Find concise public study guides for key school topics.",
            path: "/study-guides"
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Study Guides", path: "/study-guides" }
          ])
        ]}
      />
      <main id="top" className="min-h-screen overflow-x-clip pb-10 sm:pb-12">
        <PublicSiteHeader />

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pt-4">
          <div className="glass-card p-5 sm:p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Study guides</p>
            <h1 className="mt-3 font-headline text-[clamp(2.75rem,11vw,4.8rem)] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)]">Long-tail topic guides built for quick revision.</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--muted-foreground)] sm:text-base sm:leading-8">
              These pages are curated from approved, classroom-safe inputs and normalized into a consistent revision format before publication.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-8 px-4 pb-16 sm:px-6">
          {Object.entries(grouped).map(([subject, subjectGuides]) => (
            <div key={subject}>
              <div className="mb-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{subject}</p>
                <h2 className="mt-2 font-headline text-[clamp(2rem,6vw,2.75rem)] tracking-[-0.04em] text-[var(--foreground)]">{subject} guides</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {subjectGuides.map((guide) => (
                  <Link key={guide.path} href={guide.path} className="glass-card rounded-[26px] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(123,108,246,0.14)]">
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">{guide.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{guide.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {guide.keyTakeaways.slice(0, 2).map((takeaway) => (
                        <span key={takeaway} className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                          {takeaway}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <PublicSiteFooter />
      </main>
    </>
  );
}
