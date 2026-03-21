"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminCard, AdminEmptyState, AdminJsonBlock, AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SettingsPayload {
  settings: {
    feedbackEnabled: boolean;
    feedbackPromptTitle: string;
    feedbackPromptDescription: string;
    maintenanceBanner: { enabled: boolean; message: string };
    errorAlerts: { severityThreshold: "info" | "warning" | "error" | "fatal"; cooldownMinutes: number };
    landing: {
      heroEyebrow: string;
      heroTitle: string;
      heroDescription: string;
      platformTitle: string;
      platformDescription: string;
      trustTitle: string;
      trustDescription: string;
      features: Array<Record<string, unknown>>;
      highlights: Array<Record<string, unknown>>;
      testimonials: Array<Record<string, unknown>>;
    };
  };
}

export function AdminSettings() {
  const [settings, setSettings] = useState<SettingsPayload["settings"] | null>(null);
  const [featuresJson, setFeaturesJson] = useState("[]");
  const [highlightsJson, setHighlightsJson] = useState("[]");
  const [testimonialsJson, setTestimonialsJson] = useState("[]");
  const [saving, setSaving] = useState(false);

  function safeParseArrayJson(value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as SettingsPayload | null;
      if (response.ok && payload?.settings) {
        setSettings(payload.settings);
        setFeaturesJson(JSON.stringify(payload.settings.landing.features ?? [], null, 2));
        setHighlightsJson(JSON.stringify(payload.settings.landing.highlights ?? [], null, 2));
        setTestimonialsJson(JSON.stringify(payload.settings.landing.testimonials ?? [], null, 2));
      }
    }

    void load();
  }, []);

  async function saveSettings() {
    if (!settings) {
      return;
    }

    let features: Array<Record<string, unknown>>;
    let highlights: Array<Record<string, unknown>>;
    let testimonials: Array<Record<string, unknown>>;

    try {
      features = JSON.parse(featuresJson) as Array<Record<string, unknown>>;
      highlights = JSON.parse(highlightsJson) as Array<Record<string, unknown>>;
      testimonials = JSON.parse(testimonialsJson) as Array<Record<string, unknown>>;
    } catch {
      toast.error("One of the JSON blocks is invalid.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        feedbackEnabled: settings.feedbackEnabled,
        feedbackPromptTitle: settings.feedbackPromptTitle,
        feedbackPromptDescription: settings.feedbackPromptDescription,
        maintenanceBanner: settings.maintenanceBanner,
        errorAlerts: settings.errorAlerts,
        landing: {
          ...settings.landing,
          features,
          highlights,
          testimonials
        }
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; settings?: SettingsPayload["settings"] };
    setSaving(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not save settings.");
      return;
    }

    toast.success("Settings saved.");
    if (payload.settings) {
      setSettings(payload.settings);
      setFeaturesJson(JSON.stringify(payload.settings.landing.features ?? [], null, 2));
      setHighlightsJson(JSON.stringify(payload.settings.landing.highlights ?? [], null, 2));
      setTestimonialsJson(JSON.stringify(payload.settings.landing.testimonials ?? [], null, 2));
    }
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Settings" title="Platform settings" description="Loading editable site settings and landing-page content." />
        <AdminEmptyState title="Loading settings" description="Pulling the current app settings document from MongoDB." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Settings"
        title="Platform settings"
        description="Control landing-page copy, maintenance messaging, feedback availability, and error alert thresholds without touching code."
        actions={<Button onClick={saveSettings}>{saving ? "Saving..." : "Save settings"}</Button>}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminCard className="space-y-4">
          <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Feedback controls</h2>
          <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={settings.feedbackEnabled}
              onChange={(event) => setSettings((current) => (current ? { ...current, feedbackEnabled: event.target.checked } : current))}
            />
            Feedback enabled
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Prompt title</span>
            <Input
              value={settings.feedbackPromptTitle}
              onChange={(event) => setSettings((current) => (current ? { ...current, feedbackPromptTitle: event.target.value } : current))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Prompt description</span>
            <Textarea
              value={settings.feedbackPromptDescription}
              onChange={(event) =>
                setSettings((current) => (current ? { ...current, feedbackPromptDescription: event.target.value } : current))
              }
            />
          </label>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Maintenance + alerts</h2>
          <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={settings.maintenanceBanner.enabled}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? {
                        ...current,
                        maintenanceBanner: {
                          ...current.maintenanceBanner,
                          enabled: event.target.checked
                        }
                      }
                    : current
                )
              }
            />
            Maintenance banner enabled
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Banner message</span>
            <Textarea
              value={settings.maintenanceBanner.message}
              onChange={(event) =>
                setSettings((current) =>
                  current
                    ? {
                        ...current,
                        maintenanceBanner: {
                          ...current.maintenanceBanner,
                          message: event.target.value
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Alert threshold</span>
              <Select
                value={settings.errorAlerts.severityThreshold}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          errorAlerts: {
                            ...current.errorAlerts,
                            severityThreshold: event.target.value as SettingsPayload["settings"]["errorAlerts"]["severityThreshold"]
                          }
                        }
                      : current
                  )
                }
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="fatal">Fatal</option>
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Cooldown minutes</span>
              <Input
                type="number"
                min={1}
                value={String(settings.errorAlerts.cooldownMinutes)}
                onChange={(event) =>
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          errorAlerts: {
                            ...current.errorAlerts,
                            cooldownMinutes: Number(event.target.value || 1)
                          }
                        }
                      : current
                  )
                }
              />
            </label>
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminCard className="space-y-4">
          <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Landing copy</h2>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Hero eyebrow</span>
            <Input
              value={settings.landing.heroEyebrow}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, landing: { ...current.landing, heroEyebrow: event.target.value } } : current
                )
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Hero title</span>
            <Input
              value={settings.landing.heroTitle}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, landing: { ...current.landing, heroTitle: event.target.value } } : current
                )
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Hero description</span>
            <Textarea
              value={settings.landing.heroDescription}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, landing: { ...current.landing, heroDescription: event.target.value } } : current
                )
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Platform title</span>
            <Input
              value={settings.landing.platformTitle}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, landing: { ...current.landing, platformTitle: event.target.value } } : current
                )
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Trust title</span>
            <Input
              value={settings.landing.trustTitle}
              onChange={(event) =>
                setSettings((current) =>
                  current ? { ...current, landing: { ...current.landing, trustTitle: event.target.value } } : current
                )
              }
            />
          </label>
        </AdminCard>

        <AdminCard className="space-y-4">
          <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Landing content arrays</h2>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Features JSON</span>
            <Textarea className="min-h-[180px] font-mono text-xs" value={featuresJson} onChange={(event) => setFeaturesJson(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Highlights JSON</span>
            <Textarea className="min-h-[160px] font-mono text-xs" value={highlightsJson} onChange={(event) => setHighlightsJson(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Testimonials JSON</span>
            <Textarea className="min-h-[160px] font-mono text-xs" value={testimonialsJson} onChange={(event) => setTestimonialsJson(event.target.value)} />
          </label>
        </AdminCard>
      </section>

      <AdminCard>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Current payload</p>
        <div className="mt-4">
          <AdminJsonBlock
            value={{
              ...settings,
              landing: {
                ...settings.landing,
                features: safeParseArrayJson(featuresJson || "[]"),
                highlights: safeParseArrayJson(highlightsJson || "[]"),
                testimonials: safeParseArrayJson(testimonialsJson || "[]")
              }
            }}
          />
        </div>
      </AdminCard>
    </div>
  );
}
