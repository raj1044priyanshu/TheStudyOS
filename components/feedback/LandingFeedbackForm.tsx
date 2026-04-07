"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { trackEvent } from "@/lib/analytics";
import { sanitizePublicFeedbackDescription } from "@/lib/public-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  enabled: boolean;
  title: string;
  description: string;
}

const DEFAULT_FORM = {
  category: "general",
  rating: "5",
  message: "",
  name: "",
  email: ""
};

export function LandingFeedbackForm({ enabled, title, description }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const safeDescription = sanitizePublicFeedbackDescription(description);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || submitting) {
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "landing",
        category: form.category,
        rating: Number(form.rating),
        message: form.message,
        name: form.name,
        email: form.email,
        pageUrl: window.location.href,
        referrer: document.referrer,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      })
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSubmitting(false);

    if (!response.ok) {
      toast.error(data.error ?? "We couldn't save your feedback.");
      return;
    }

    toast.success("Thanks for the feedback.");
    trackEvent("feedback_submitted", {
      source: "landing",
      category: form.category,
      rating: Number(form.rating)
    });
    setForm(DEFAULT_FORM);
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="glass-card grid gap-6 p-6 md:grid-cols-[0.95fr_1.05fr] md:p-8">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Feedback</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">{title}</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">{safeDescription}</p>
          <div className="surface-card mt-5 rounded-[22px] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            Feedback includes page and device context so our team can review it properly.
          </div>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Category</span>
              <Select
                value={form.category}
                disabled={!enabled || submitting}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="general">General</option>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature request</option>
                <option value="content">Content</option>
                <option value="design">Design</option>
                <option value="performance">Performance</option>
                <option value="support">Support</option>
                <option value="other">Other</option>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Rating</span>
              <Select
                value={form.rating}
                disabled={!enabled || submitting}
                onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Rough</option>
                <option value="1">1 - Broken</option>
              </Select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Message</span>
            <Textarea
              required
              minLength={8}
              maxLength={5000}
              placeholder="Tell us what happened, what felt missing, or what should improve."
              value={form.message}
              disabled={!enabled || submitting}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              className="min-h-[160px]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Name</span>
              <Input
                placeholder="Optional"
                value={form.name}
                disabled={!enabled || submitting}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Email</span>
              <Input
                type="email"
                placeholder="Optional"
                value={form.email}
                disabled={!enabled || submitting}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              {enabled ? "Anonymous reports are allowed. Contact details are optional." : "Feedback is currently disabled by the admin."}
            </p>
            <Button type="submit" disabled={!enabled || submitting}>
              {submitting ? "Sending..." : "Send feedback"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
