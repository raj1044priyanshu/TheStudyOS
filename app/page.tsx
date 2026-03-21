import Link from "next/link";
import {
  IconArrowUpRight,
  IconArrowRight,
  IconBook2,
  IconBrain,
  IconCalendarCheck,
  IconChartLine,
  IconHelpCircle,
  IconLayersIntersect,
  IconPlayerPlay,
  IconShieldCheck,
  IconSparkles,
  IconTopologyStar3
} from "@tabler/icons-react";
import { LandingFeedbackForm } from "@/components/feedback/LandingFeedbackForm";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { getPublicAppSettings } from "@/lib/app-settings";

const FEATURE_ICON_MAP = {
  book: IconBook2,
  help: IconHelpCircle,
  calendar: IconCalendarCheck,
  brain: IconBrain,
  layers: IconLayersIntersect,
  play: IconPlayerPlay,
  topology: IconTopologyStar3,
  chart: IconChartLine
} as const;

export default async function LandingPage() {
  const settings = await getPublicAppSettings();
  const features = settings.landing.features.map((feature) => ({
    ...feature,
    icon: FEATURE_ICON_MAP[feature.iconKey as keyof typeof FEATURE_ICON_MAP] ?? IconSparkles
  }));

  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-6 pt-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo compact />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-4">
        <div className="grid items-start gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="animate-fade-up-soft space-y-6">
            <p className="glass-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--muted-foreground)]">
              <IconSparkles className="h-3.5 w-3.5 text-[#7B6CF6]" /> {settings.landing.heroEyebrow}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-headline text-5xl leading-[0.96] tracking-[-0.03em] text-[var(--foreground)] md:text-7xl">
                {settings.landing.heroTitle}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                {settings.landing.heroDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Enter StudyOS <IconArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Explore the workflow
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {settings.landing.highlights.map((item) => (
                <div key={item.title} className="glass-card p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card animate-fade-up-soft p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{settings.landing.heroPanelEyebrow}</p>
                <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">{settings.landing.heroPanelTitle}</h2>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#7B6CF6]/12 text-[#7B6CF6]">
                <IconArrowUpRight className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="surface-card-strong rounded-[24px] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Daily rhythm</p>
                    <p className="mt-2 font-headline text-4xl text-[#7B6CF6]">84%</p>
                  </div>
                  <div className="grid gap-2 text-right text-xs text-[var(--muted-foreground)]">
                    <span>Physics revision</span>
                    <span>Quiz practice</span>
                    <span>Mind map review</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {features.slice(0, 4).map((feature) => (
                    <div key={feature.title} className="surface-card rounded-[22px] p-4">
                    <div className="surface-icon mb-3 inline-flex rounded-full p-2">
                      <feature.icon className="h-[18px] w-[18px]" />
                    </div>
                    <h3 className="text-sm font-medium text-[var(--foreground)]">{feature.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-[color:var(--secondary-button-border)] bg-[color:var(--secondary-button-bg)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#7B6CF6]">Feature set</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {features.slice(4).map((feature) => (
                    <span key={feature.title} className="surface-pill rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)]">
                      {feature.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{settings.landing.platformEyebrow}</p>
            <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">{settings.landing.platformTitle}</h2>
          </div>
          <p className="hidden max-w-md text-sm leading-6 text-[var(--muted-foreground)] md:block">
            {settings.landing.platformDescription}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
              <div key={feature.title} className="glass-card lift-3d p-5">
              <div className="mb-4 inline-flex rounded-full bg-[#7B6CF6]/10 p-2.5 text-[#7B6CF6]">
                <feature.icon className="h-[18px] w-[18px]" />
              </div>
              <h3 className="text-base font-medium text-[var(--foreground)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="glass-card grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{settings.landing.trustEyebrow}</p>
            <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">{settings.landing.trustTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {settings.landing.trustDescription}
            </p>
            <div className="surface-pill mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--muted-foreground)]">
              <IconShieldCheck className="h-4 w-4 text-[#7B6CF6]" />
              Real data. Real progress. One place.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {settings.landing.testimonials.map((item) => (
              <div key={item.name} className="surface-card rounded-[22px] p-5">
                <p className="text-sm leading-6 text-[var(--foreground)]">{`"${item.text}"`}</p>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFeedbackForm
        enabled={settings.feedbackEnabled && settings.featureToggles.feedback}
        title={settings.feedbackPromptTitle}
        description={settings.feedbackPromptDescription}
      />

      <footer className="border-t border-[color:var(--panel-border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-6">
          <Link href="/login">Login</Link>
          <span>•</span>
          <span>Built for focused students</span>
        </div>
      </footer>
    </main>
  );
}
