import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURE_PAGES, getFeatureBySlug } from "@/content/features";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { PublicSiteFooter } from "@/components/content/PublicSiteFooter";
import { PublicSiteHeader } from "@/components/content/PublicSiteHeader";
import { StructuredData } from "@/components/seo/StructuredData";
import { buttonVariants } from "@/components/ui/button-styles";
import { createBreadcrumbJsonLd, createFaqJsonLd, createWebPageJsonLd } from "@/lib/structured-data";

interface Params {
  params: {
    slug: string;
  };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURE_PAGES.map((feature) => ({
    slug: feature.slug
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const feature = getFeatureBySlug(params.slug);

  if (!feature) {
    return {};
  }

  return {
    title: feature.title,
    description: feature.seoDescription,
    alternates: {
      canonical: `/features/${feature.slug}`
    }
  };
}

export default function FeatureDetailPage({ params }: Params) {
  const feature = getFeatureBySlug(params.slug);
  if (!feature) {
    notFound();
  }

  return (
    <>
      <StructuredData
        data={[
          createWebPageJsonLd({
            name: `${feature.title} | StudyOS`,
            description: feature.seoDescription,
            path: `/features/${feature.slug}`
          }),
          createBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" },
            { name: feature.title, path: `/features/${feature.slug}` }
          ]),
          createFaqJsonLd(feature.faqs)
        ]}
      />
      <main className="min-h-screen pb-12">
        <PublicSiteHeader />

        <section className="mx-auto max-w-6xl px-6 pb-12 pt-4">
          <div className="glass-card grid gap-6 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{feature.eyebrow}</p>
              <h1 className="mt-3 font-headline text-[clamp(3rem,7vw,4.7rem)] tracking-[-0.05em] text-[var(--foreground)]">{feature.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">{feature.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <TrackedLink
                  href="/login"
                  className={buttonVariants({ size: "lg" })}
                  tracking={{
                    event: "cta_click",
                    params: {
                      location: `feature:${feature.slug}`,
                      label: "Try StudyOS",
                      destination: "/login"
                    }
                  }}
                >
                  Try StudyOS
                </TrackedLink>
                <Link href="/features" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  Back to features
                </Link>
              </div>
            </div>

            <div className="surface-card rounded-[24px] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Highlights</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {feature.highlights.map((highlight) => (
                  <span key={highlight} className="surface-pill rounded-full px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
                    {highlight}
                  </span>
                ))}
              </div>
              <div className="mt-6 space-y-4">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="glass-card rounded-[26px] p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Why students use it</p>
              <div className="mt-4 space-y-4">
                {feature.benefits.map((benefit) => (
                  <div key={benefit} className="rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
                    {benefit}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-[26px] p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">How it fits your workflow</p>
              <ol className="mt-4 space-y-3">
                {feature.workflow.map((step, index) => (
                  <li key={step} className="flex gap-4 rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-4">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7B6CF6] text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-7 text-[var(--muted-foreground)]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="glass-card rounded-[26px] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">FAQ</p>
                <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)]">Common questions</h2>
              </div>
              <Link href="/resources" className="text-sm font-medium text-[#7B6CF6]">
                Explore study resources
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {feature.faqs.map((faq) => (
                <div key={faq.question} className="surface-card rounded-[22px] p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PublicSiteFooter />
      </main>
    </>
  );
}
