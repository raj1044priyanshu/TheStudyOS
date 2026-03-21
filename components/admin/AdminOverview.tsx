"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminIssueSummary } from "@/types";
import { AdminCard, AdminEmptyState, AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";

interface OverviewPayload {
  metrics: Record<string, number>;
  bugMetrics: {
    totalTrackedIssues: number;
    unresolvedIssues: number;
    resolvedIssues: number;
    runtimeErrorCount: number;
    bugFeedbackCount: number;
    unresolvedErrorCount: number;
    unresolvedBugFeedbackCount: number;
    resolvedErrorCount: number;
    resolvedBugFeedbackCount: number;
  };
  activeBugs: AdminIssueSummary[];
  recentFeedback: Array<Record<string, string>>;
  recentErrors: Array<Record<string, string | number>>;
  recentAudit: Array<Record<string, string>>;
  system: {
    emailConfigured: boolean;
    emailDiagnostics: string[];
  };
}

export function AdminOverview() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as OverviewPayload | null;
      if (response.ok && payload) {
        setData(payload);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="StudyOS control plane"
        description="Manage users, platform data, landing-page feedback, system errors, and operational health from one place."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh now"}
            </Button>
            <Link href="/admin/errors">
              <Button>Open bug center</Button>
            </Link>
          </div>
        }
      />

      {!data ? (
        <AdminEmptyState title="Loading admin overview" description="Pulling platform metrics, recent feedback, error groups, and audit activity." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Users" value={data.metrics.users ?? 0} helper="Total accounts in StudyOS." />
            <AdminStatCard label="Notes" value={data.metrics.notes ?? 0} helper="Persisted generated notes." />
            <AdminStatCard label="Quizzes" value={data.metrics.quizzes ?? 0} helper="Saved quiz sessions." />
            <AdminStatCard label="Plans" value={data.metrics.plans ?? 0} helper="Stored study plans." />
            <AdminStatCard label="Feedback" value={data.metrics.feedback ?? 0} helper={`${data.metrics.openFeedback ?? 0} still need attention.`} />
            <AdminStatCard label="Errors" value={data.metrics.errors ?? 0} helper={`${data.metrics.openErrors ?? 0} are unresolved.`} />
            <AdminStatCard label="Achievements" value={data.metrics.achievements ?? 0} helper="Unlocked achievement records." />
            <AdminStatCard
              label="Email Alerts"
              value={data.system.emailConfigured ? "Ready" : "Blocked"}
              helper={data.system.emailConfigured ? "Critical errors can notify admins." : "SMTP diagnostics need attention."}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Current bugs</p>
                  <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Website health right now</h2>
                </div>
                <Link href="/admin/errors" className="text-sm font-medium text-[#7B6CF6]">
                  Open bug center
                </Link>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AdminStatCard
                  label="Tracked issues"
                  value={data.bugMetrics.totalTrackedIssues}
                  helper="Runtime errors plus feedback reports marked as bugs."
                />
                <AdminStatCard
                  label="Unresolved"
                  value={data.bugMetrics.unresolvedIssues}
                  helper={`${data.bugMetrics.unresolvedErrorCount} errors, ${data.bugMetrics.unresolvedBugFeedbackCount} bug reports.`}
                />
                <AdminStatCard
                  label="Resolved"
                  value={data.bugMetrics.resolvedIssues}
                  helper={`${data.bugMetrics.resolvedErrorCount} errors, ${data.bugMetrics.resolvedBugFeedbackCount} bug reports.`}
                />
                <AdminStatCard
                  label="Runtime errors"
                  value={data.bugMetrics.runtimeErrorCount}
                  helper="All grouped error fingerprints."
                />
                <AdminStatCard
                  label="Bug feedback"
                  value={data.bugMetrics.bugFeedbackCount}
                  helper="User-submitted feedback where category is bug."
                />
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Active issues</p>
                  <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Currently unresolved</h2>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">Auto-refreshes every 30 seconds</span>
              </div>
              <div className="mt-5 space-y-3">
                {data.activeBugs.length ? (
                  data.activeBugs.map((item) => (
                    <div key={`${item.kind}-${item.id}`} className="surface-card rounded-[22px] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[color:var(--surface-low)] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                            {item.kind === "error_log" ? "Runtime error" : "Bug feedback"}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">{item.severityOrPriority}</span>
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)]">{item.status}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.title}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
                        <span>{item.location}</span>
                        <span>{new Date(item.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No unresolved issues are currently tracked.</p>
                )}
              </div>
            </AdminCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Recent feedback</p>
                  <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">What users are saying</h2>
                </div>
                <Link href="/admin/feedback" className="text-sm font-medium text-[#7B6CF6]">
                  Open queue
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {data.recentFeedback.length ? (
                  data.recentFeedback.map((item, index) => (
                    <div key={`${item._id ?? index}`} className="surface-card rounded-[22px] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{item.category}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{item.status}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.message}</p>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">{item.email || item.name || item.pageUrl || "Anonymous"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No feedback has been submitted yet.</p>
                )}
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Recent errors</p>
                  <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Latest grouped failures</h2>
                </div>
                <Link href="/admin/errors" className="text-sm font-medium text-[#7B6CF6]">
                  Open errors
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {data.recentErrors.length ? (
                  data.recentErrors.map((item, index) => (
                    <div key={`${item._id ?? index}`} className="surface-card rounded-[22px] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{item.severity}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{String(item.occurrences)} hits</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.message}</p>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">{item.route || item.url || item.source}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No error groups captured yet.</p>
                )}
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Audit trail</p>
                  <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Recent admin actions</h2>
                </div>
                <Link href="/admin/audit" className="text-sm font-medium text-[#7B6CF6]">
                  View audit
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {data.recentAudit.length ? (
                  data.recentAudit.map((item, index) => (
                    <div key={`${item._id ?? index}`} className="surface-card rounded-[22px] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{item.action}</p>
                      <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.summary}</p>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">{item.targetModel}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No admin mutations have been logged yet.</p>
                )}
              </div>
            </AdminCard>
          </section>

          {!data.system.emailConfigured && data.system.emailDiagnostics.length ? (
            <AdminCard className="border border-amber-400/30">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-500">Alert health</p>
              <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">SMTP needs attention</h2>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted-foreground)]">
                {data.system.emailDiagnostics.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AdminCard>
          ) : null}
        </>
      )}
    </div>
  );
}
