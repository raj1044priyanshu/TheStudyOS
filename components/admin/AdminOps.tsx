"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HealthPayload {
  database: { ok: boolean; readyState: number };
  email: { ok: boolean; error?: string; diagnostics: string[]; provider: string };
  cloudinary: { ok: boolean };
  ai: {
    primary: {
      source: string;
      provider: string;
      ready: boolean;
      fingerprint: string;
      textModel: string;
      imageModel: string;
      validationStatus: string;
      validationMessage: string;
    };
    fallback: {
      source: string;
      provider: string;
      ready: boolean;
      fingerprint: string;
      textModel: string;
      validationStatus: string;
      validationMessage: string;
    };
  };
  env: Array<{ key: string; ready: boolean }>;
}

interface AuditPayload {
  items: Array<{ _id: string; action: string; summary: string; createdAt: string; targetModel: string }>;
}

interface AiConfigPayload {
  config: {
    encryptionReady: boolean;
    primary: {
      source: string;
      provider: string;
      apiBase: string;
      apiKeyPresent: boolean;
      keyFingerprint: string;
      textModel: string;
      multimodalModel: string;
      imageModel: string;
      lastValidatedAt: string | null;
      lastValidationStatus: string;
      lastValidationMessage: string;
    };
    fallback: {
      source: string;
      provider: string;
      apiBase: string;
      apiKeyPresent: boolean;
      keyFingerprint: string;
      textModel: string;
      multimodalModel: string;
      imageModel: string;
      lastValidatedAt: string | null;
      lastValidationStatus: string;
      lastValidationMessage: string;
    };
  };
}

interface AiUsagePayload {
  summary: {
    requests: number;
    totalTokens: number;
    imageGenerations: number;
    errorRate: number;
  };
  last24h: {
    requests: number;
    totalTokens: number;
    imageGenerations: number;
    errorRate: number;
  };
  byProvider: Array<{
    provider: string;
    requests: number;
    tokens: number;
    images: number;
    errors: number;
    errorRate: number;
  }>;
  byRoute: Array<{
    route: string;
    requests: number;
    tokens: number;
    errors: number;
    errorRate: number;
  }>;
  recent: Array<{
    _id: string;
    provider: string;
    capability: string;
    route: string;
    model: string;
    totalTokens: number;
    imageCount: number;
    success: boolean;
    errorCode: string;
    keyFingerprint: string;
    createdAt: string;
  }>;
  dailyQuotaResetAt: string;
  aiStudioLinks: {
    usage: string;
    rateLimits: string;
    pricing: string;
  };
}

interface ProviderFormState {
  apiBase: string;
  textModel: string;
  multimodalModel: string;
  imageModel: string;
  apiKey: string;
  resetToEnv: boolean;
}

const EMPTY_PROVIDER_FORM: ProviderFormState = {
  apiBase: "",
  textModel: "",
  multimodalModel: "",
  imageModel: "",
  apiKey: "",
  resetToEnv: false
};

function formatCountdown(resetAt: string) {
  const delta = Math.max(0, new Date(resetAt).getTime() - Date.now());
  const hours = Math.floor(delta / (1000 * 60 * 60));
  const minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export function AdminOps() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload["items"]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfigPayload["config"] | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsagePayload | null>(null);
  const [primaryForm, setPrimaryForm] = useState<ProviderFormState>(EMPTY_PROVIDER_FORM);
  const [fallbackForm, setFallbackForm] = useState<ProviderFormState>(EMPTY_PROVIDER_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [healthResponse, auditResponse, aiConfigResponse, aiUsageResponse] = await Promise.all([
      fetch("/api/admin/health", { cache: "no-store" }),
      fetch("/api/admin/audit", { cache: "no-store" }),
      fetch("/api/admin/ai-config", { cache: "no-store" }),
      fetch("/api/admin/ai-usage", { cache: "no-store" })
    ]);

    const healthPayload = (await healthResponse.json().catch(() => null)) as HealthPayload | null;
    const auditPayload = (await auditResponse.json().catch(() => ({ items: [] }))) as AuditPayload;
    const aiConfigPayload = (await aiConfigResponse.json().catch(() => null)) as AiConfigPayload | null;
    const aiUsagePayload = (await aiUsageResponse.json().catch(() => null)) as AiUsagePayload | null;

    if (healthResponse.ok && healthPayload) {
      setHealth(healthPayload);
    }
    if (auditResponse.ok) {
      setAudit(auditPayload.items ?? []);
    }
    if (aiConfigResponse.ok && aiConfigPayload?.config) {
      setAiConfig(aiConfigPayload.config);
      setPrimaryForm({
        apiBase: aiConfigPayload.config.primary.apiBase || "",
        textModel: aiConfigPayload.config.primary.textModel || "",
        multimodalModel: aiConfigPayload.config.primary.multimodalModel || "",
        imageModel: aiConfigPayload.config.primary.imageModel || "",
        apiKey: "",
        resetToEnv: false
      });
      setFallbackForm({
        apiBase: aiConfigPayload.config.fallback.apiBase || "",
        textModel: aiConfigPayload.config.fallback.textModel || "",
        multimodalModel: aiConfigPayload.config.fallback.multimodalModel || "",
        imageModel: aiConfigPayload.config.fallback.imageModel || "",
        apiKey: "",
        resetToEnv: false
      });
    }
    if (aiUsageResponse.ok && aiUsagePayload) {
      setAiUsage(aiUsagePayload);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const configStatusCopy = useMemo(() => {
    if (!aiConfig) {
      return "";
    }

    return aiConfig.encryptionReady
      ? "Stored provider keys can be encrypted and hot-swapped without a redeploy."
      : "AI_PROVIDER_ENCRYPTION_KEY is missing, so admin-entered provider keys cannot be stored yet.";
  }, [aiConfig]);

  async function saveAiConfig() {
    const primaryPatch: Record<string, unknown> = {
      apiBase: primaryForm.apiBase,
      textModel: primaryForm.textModel,
      multimodalModel: primaryForm.multimodalModel,
      imageModel: primaryForm.imageModel
    };
    const fallbackPatch: Record<string, unknown> = {
      apiBase: fallbackForm.apiBase,
      textModel: fallbackForm.textModel
    };

    if (primaryForm.apiKey.trim()) {
      primaryPatch.apiKey = primaryForm.apiKey.trim();
    }
    if (primaryForm.resetToEnv) {
      primaryPatch.resetToEnv = true;
    }
    if (fallbackForm.apiKey.trim()) {
      fallbackPatch.apiKey = fallbackForm.apiKey.trim();
    }
    if (fallbackForm.resetToEnv) {
      fallbackPatch.resetToEnv = true;
    }

    setSaving(true);
    const response = await fetch("/api/admin/ai-config", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        primary: primaryPatch,
        fallback: fallbackPatch
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not save AI configuration.");
      return;
    }

    toast.success("AI configuration updated.");
    await load();
  }

  if (!health || !aiConfig || !aiUsage) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Ops"
          title="Operational health"
          description="Checking infrastructure readiness, AI providers, quota signals, and recent admin actions."
        />
        <AdminEmptyState title="Loading operational status" description="Collecting database, provider, and AI usage telemetry." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Ops"
        title="Operational health"
        description="Check runtime readiness, AI provider state, request and token usage, and the latest admin control-plane activity."
        actions={<Button onClick={() => void load()}>Refresh</Button>}
      />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <AdminStatCard label="Database" value={health.database.ok ? "Healthy" : "Offline"} helper={`Ready state: ${health.database.readyState}`} />
        <AdminStatCard label="Email" value={health.email.ok ? "Healthy" : "Blocked"} helper={health.email.provider.toUpperCase()} />
        <AdminStatCard label="Cloudinary" value={health.cloudinary.ok ? "Ready" : "Missing"} helper="Image uploads for note visuals." />
        <AdminStatCard label="AI requests" value={aiUsage.summary.requests} helper="Last 7 days" />
        <AdminStatCard label="AI tokens" value={aiUsage.summary.totalTokens} helper="Last 7 days" />
        <AdminStatCard label="Quota reset" value={formatCountdown(aiUsage.dailyQuotaResetAt)} helper="Approx. to next Pacific midnight" />
      </section>

      {!health.email.ok ? (
        <AdminCard className="border border-amber-400/30">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-500">SMTP diagnostics</p>
          <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Email alerting is not healthy</h2>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">{health.email.error || "SMTP verification failed."}</p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--muted-foreground)]">
            {health.email.diagnostics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
        <AdminCard className="space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">AI control plane</p>
            <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Provider config + validation</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{configStatusCopy}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Google primary</p>
              <p className="mt-3 text-sm text-[var(--foreground)]">Source: {aiConfig.primary.source}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Fingerprint: {aiConfig.primary.keyFingerprint || "missing"}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Text model: {aiConfig.primary.textModel}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Image model: {aiConfig.primary.imageModel}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Validation: {aiConfig.primary.lastValidationStatus} {aiConfig.primary.lastValidationMessage ? `• ${aiConfig.primary.lastValidationMessage}` : ""}
              </p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Groq fallback</p>
              <p className="mt-3 text-sm text-[var(--foreground)]">Source: {aiConfig.fallback.source}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Fingerprint: {aiConfig.fallback.keyFingerprint || "missing"}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Text model: {aiConfig.fallback.textModel}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Validation: {aiConfig.fallback.lastValidationStatus} {aiConfig.fallback.lastValidationMessage ? `• ${aiConfig.fallback.lastValidationMessage}` : ""}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-headline text-2xl tracking-[-0.03em] text-[var(--foreground)]">Update Google config</h3>
              <Input value={primaryForm.apiBase} onChange={(event) => setPrimaryForm((current) => ({ ...current, apiBase: event.target.value }))} placeholder="API base" />
              <Input value={primaryForm.textModel} onChange={(event) => setPrimaryForm((current) => ({ ...current, textModel: event.target.value }))} placeholder="Text model" />
              <Input
                value={primaryForm.multimodalModel}
                onChange={(event) => setPrimaryForm((current) => ({ ...current, multimodalModel: event.target.value }))}
                placeholder="Multimodal model"
              />
              <Input value={primaryForm.imageModel} onChange={(event) => setPrimaryForm((current) => ({ ...current, imageModel: event.target.value }))} placeholder="Image model" />
              <Input value={primaryForm.apiKey} onChange={(event) => setPrimaryForm((current) => ({ ...current, apiKey: event.target.value }))} placeholder="New Google API key (optional)" />
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={primaryForm.resetToEnv}
                  onChange={(event) => setPrimaryForm((current) => ({ ...current, resetToEnv: event.target.checked }))}
                />
                Reset stored Google key and use env fallback
              </label>
            </div>

            <div className="space-y-3">
              <h3 className="font-headline text-2xl tracking-[-0.03em] text-[var(--foreground)]">Update Groq fallback</h3>
              <Input value={fallbackForm.apiBase} onChange={(event) => setFallbackForm((current) => ({ ...current, apiBase: event.target.value }))} placeholder="API base" />
              <Input value={fallbackForm.textModel} onChange={(event) => setFallbackForm((current) => ({ ...current, textModel: event.target.value }))} placeholder="Text model" />
              <Input value={fallbackForm.apiKey} onChange={(event) => setFallbackForm((current) => ({ ...current, apiKey: event.target.value }))} placeholder="New Groq API key (optional)" />
              <label className="flex items-center gap-3 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={fallbackForm.resetToEnv}
                  onChange={(event) => setFallbackForm((current) => ({ ...current, resetToEnv: event.target.checked }))}
                />
                Reset stored fallback key and use env fallback
              </label>
              <Button onClick={() => void saveAiConfig()}>{saving ? "Saving..." : "Save AI config"}</Button>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Usage ledger</p>
            <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Requests, tokens, and image generation</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Requests</p>
              <p className="mt-3 font-headline text-3xl text-[var(--foreground)]">{aiUsage.summary.requests}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{aiUsage.last24h.requests} in the last 24h</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Tokens</p>
              <p className="mt-3 font-headline text-3xl text-[var(--foreground)]">{aiUsage.summary.totalTokens}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{aiUsage.last24h.totalTokens} in the last 24h</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Images</p>
              <p className="mt-3 font-headline text-3xl text-[var(--foreground)]">{aiUsage.summary.imageGenerations}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{aiUsage.last24h.imageGenerations} in the last 24h</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Error rate</p>
              <p className="mt-3 font-headline text-3xl text-[var(--foreground)]">{aiUsage.summary.errorRate}%</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{aiUsage.last24h.errorRate}% in the last 24h</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={aiUsage.aiStudioLinks.usage} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[var(--surface-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              Open AI Studio
            </a>
            <a href={aiUsage.aiStudioLinks.rateLimits} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[var(--surface-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              Rate limits guide
            </a>
            <a href={aiUsage.aiStudioLinks.pricing} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[var(--surface-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
              Pricing guide
            </a>
          </div>

          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Google does not expose a single fixed free-tier expiry date here. This dashboard shows app-side usage and the next daily reset window, while AI Studio remains the source of truth for current project quotas and active rate limits.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">By provider</p>
              {aiUsage.byProvider.map((item) => (
                <div key={item.provider} className="surface-card rounded-[20px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--foreground)]">{item.provider}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">{item.errorRate}% errors</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {item.requests} requests • {item.tokens} tokens • {item.images} images
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">By route</p>
              {aiUsage.byRoute.map((item) => (
                <div key={item.route} className="surface-card rounded-[20px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--foreground)]">{item.route}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">{item.errorRate}% errors</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {item.requests} requests • {item.tokens} tokens
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Environment</p>
          <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Runtime readiness</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {health.env.map((item) => (
              <div key={item.key} className="surface-card rounded-[22px] p-4">
                <p className="font-mono text-xs text-[var(--foreground)]">{item.key}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.ready ? "Configured" : "Missing"}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Recent AI activity</p>
          <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Latest ledger entries</h2>
          <div className="mt-5 space-y-3">
            {aiUsage.recent.length ? (
              aiUsage.recent.map((item) => (
                <div key={item._id} className="surface-card rounded-[22px] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-[var(--foreground)]">
                      {item.provider} • {item.capability}
                    </p>
                    <span className={item.success ? "text-xs text-[#047857]" : "text-xs text-[#B91C1C]"}>{item.success ? "Success" : "Failed"}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {item.route} • {item.model || "model unavailable"} • {item.totalTokens} tokens • fingerprint {item.keyFingerprint || "n/a"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{new Date(item.createdAt).toLocaleString()}</p>
                  {!item.success && item.errorCode ? <p className="mt-2 text-xs text-[#B91C1C]">{item.errorCode}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No AI usage has been logged yet.</p>
            )}
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Provider health</p>
          <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Image-generation readiness</h2>
          <div className="mt-5 space-y-3">
            <div className="surface-card rounded-[22px] p-4">
              <p className="font-medium text-[var(--foreground)]">Google image generation</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {health.ai.primary.validationMessage || "Validation message unavailable."}
              </p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="font-medium text-[var(--foreground)]">Cloudinary upload path</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {health.cloudinary.ok ? "Cloudinary is configured for note visual uploads." : "Cloudinary is missing, so generated note visuals cannot be saved."}
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Recent audit</p>
          <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Latest control-plane changes</h2>
          <div className="mt-5 space-y-3">
            {audit.length ? (
              audit.slice(0, 10).map((item) => (
                <div key={item._id} className="surface-card rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{item.action}</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{item.summary}</p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{item.targetModel}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No admin changes have been logged yet.</p>
            )}
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
