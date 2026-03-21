"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPrimitives";

interface HealthPayload {
  database: { ok: boolean; readyState: number };
  email: { ok: boolean; error?: string; diagnostics: string[]; provider: string };
  env: Array<{ key: string; ready: boolean }>;
}

interface AuditPayload {
  items: Array<{ _id: string; action: string; summary: string; createdAt: string; targetModel: string }>;
}

export function AdminOps() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload["items"]>([]);

  useEffect(() => {
    async function load() {
      const [healthResponse, auditResponse] = await Promise.all([
        fetch("/api/admin/health", { cache: "no-store" }),
        fetch("/api/admin/audit", { cache: "no-store" })
      ]);

      const healthPayload = (await healthResponse.json().catch(() => null)) as HealthPayload | null;
      const auditPayload = (await auditResponse.json().catch(() => ({ items: [] }))) as AuditPayload;

      if (healthResponse.ok && healthPayload) {
        setHealth(healthPayload);
      }
      if (auditResponse.ok) {
        setAudit(auditPayload.items ?? []);
      }
    }

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Ops"
        title="Operational health"
        description="Check database/email readiness, environment coverage, and recent admin actions that changed the platform."
      />

      {!health ? (
        <AdminEmptyState title="Loading operational status" description="Checking database connectivity, SMTP health, and environment readiness." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <AdminStatCard label="Database" value={health.database.ok ? "Healthy" : "Offline"} helper={`Ready state: ${health.database.readyState}`} />
            <AdminStatCard label="Email" value={health.email.ok ? "Healthy" : "Blocked"} helper={health.email.provider.toUpperCase()} />
            <AdminStatCard
              label="Env coverage"
              value={`${health.env.filter((item) => item.ready).length}/${health.env.length}`}
              helper="Configured keys visible to the server."
            />
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

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
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
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Recent audit</p>
              <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Latest control-plane changes</h2>
              <div className="mt-5 space-y-3">
                {audit.length ? (
                  audit.slice(0, 8).map((item) => (
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
        </>
      )}
    </div>
  );
}
