"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AdminCard, AdminEmptyState, AdminJsonBlock, AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initialUserId?: string;
}

interface ErrorItem {
  _id: string;
  fingerprint: string;
  source: string;
  severity: "info" | "warning" | "error" | "fatal";
  status: "open" | "acknowledged" | "resolved" | "ignored";
  message: string;
  route?: string;
  url?: string;
  occurrences: number;
  lastSeenAt?: string;
  userEmail?: string;
  events?: Array<Record<string, unknown>>;
}

interface BugFeedbackItem {
  _id: string;
  status: "open" | "in_review" | "resolved" | "ignored";
  priority: "low" | "medium" | "high" | "urgent";
  message: string;
  pageUrl?: string;
  email?: string;
  name?: string;
  userId?: string;
  updatedAt?: string;
  createdAt?: string;
  labels?: string[];
  adminNotes?: string;
}

interface AnalysisFinding {
  kind: "error_log" | "bug_feedback";
  id: string;
  title: string;
  status: string;
  severityOrPriority: string;
  location: string;
  updatedAt: string;
  score: number;
  reason: string;
}

interface AnalysisHotspot {
  location: string;
  totalItems: number;
  errorCount: number;
  feedbackCount: number;
  latestSeenAt: string;
}

interface AnalysisAction {
  urgency: "critical" | "high" | "moderate";
  title: string;
  detail: string;
}

interface AnalysisPayload {
  generatedAt: string;
  summary: {
    systemIssueCount: number;
    feedbackBugCount: number;
    activeSystemIssueCount: number;
    activeFeedbackBugCount: number;
    criticalSystemIssueCount: number;
    urgentFeedbackCount: number;
    highRiskFindingCount: number;
    hotspotCount: number;
  };
  findings: AnalysisFinding[];
  hotspots: AnalysisHotspot[];
  recommendedActions: AnalysisAction[];
}

interface ErrorsPayload {
  summary: {
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
  errorItems: ErrorItem[];
  bugFeedbackItems: BugFeedbackItem[];
}

const EMPTY_SUMMARY: ErrorsPayload["summary"] = {
  totalTrackedIssues: 0,
  unresolvedIssues: 0,
  resolvedIssues: 0,
  runtimeErrorCount: 0,
  bugFeedbackCount: 0,
  unresolvedErrorCount: 0,
  unresolvedBugFeedbackCount: 0,
  resolvedErrorCount: 0,
  resolvedBugFeedbackCount: 0
};

function formatAnalysisKind(kind: AnalysisFinding["kind"]) {
  return kind === "error_log" ? "System issue" : "Feedback bug";
}

function urgencyClasses(urgency: AnalysisAction["urgency"]) {
  switch (urgency) {
    case "critical":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "high":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-[color:var(--panel-border)] bg-[color:var(--surface-low)] text-[var(--foreground)]";
  }
}

export function AdminErrors({ initialUserId = "" }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [userId, setUserId] = useState(initialUserId);
  const [summary, setSummary] = useState<ErrorsPayload["summary"]>(EMPTY_SUMMARY);
  const [errorItems, setErrorItems] = useState<ErrorItem[]>([]);
  const [bugFeedbackItems, setBugFeedbackItems] = useState<BugFeedbackItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [analysisSignature, setAnalysisSignature] = useState<string | null>(null);
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<ErrorItem | null>(null);
  const [bugDetail, setBugDetail] = useState<BugFeedbackItem | null>(null);
  const [labelsInput, setLabelsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingError, setSavingError] = useState(false);
  const [savingBug, setSavingBug] = useState(false);

  const currentFilterSignature = JSON.stringify({
    q: query,
    status,
    severity,
    source,
    priority,
    userId
  });
  const analysisIsStale = Boolean(analysis) && analysisSignature !== currentFilterSignature;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
      if (source) params.set("source", source);
      if (priority) params.set("priority", priority);
      if (userId) params.set("userId", userId);

      const response = await fetch(`/api/admin/errors?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ErrorsPayload | null;
      if (response.ok && payload) {
        setSummary(payload.summary ?? EMPTY_SUMMARY);
        setErrorItems(payload.errorItems ?? []);
        setBugFeedbackItems(payload.bugFeedbackItems ?? []);
        setAnalysisSignature((current) => (current ? "__stale__" : current));
      }
    } finally {
      setLoading(false);
    }
  }, [priority, query, severity, source, status, userId]);

  const analyzeIssues = useCallback(async () => {
    const filters = {
      q: query,
      status,
      severity,
      source,
      priority,
      userId
    };

    setAnalyzing(true);
    try {
      const response = await fetch("/api/admin/errors/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(filters)
      });
      const payload = (await response.json().catch(() => null)) as { analysis?: AnalysisPayload; error?: string } | null;

      if (!response.ok || !payload?.analysis) {
        toast.error(payload?.error ?? "Could not analyze the current issues.");
        return;
      }

      setAnalysis(payload.analysis);
      setAnalysisSignature(currentFilterSignature);
      toast.success("Issue analysis completed.");
    } finally {
      setAnalyzing(false);
    }
  }, [currentFilterSignature, priority, query, severity, source, status, userId]);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    async function loadErrorDetail() {
      if (!selectedErrorId) {
        setErrorDetail(null);
        return;
      }

      const response = await fetch(`/api/admin/errors/${selectedErrorId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { item?: ErrorItem } | null;
      if (response.ok && payload?.item) {
        setErrorDetail(payload.item);
      }
    }

    void loadErrorDetail();
  }, [selectedErrorId]);

  useEffect(() => {
    async function loadBugDetail() {
      if (!selectedBugId) {
        setBugDetail(null);
        setLabelsInput("");
        return;
      }

      const response = await fetch(`/api/admin/feedback/${selectedBugId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { item?: BugFeedbackItem } | null;
      if (response.ok && payload?.item) {
        setBugDetail(payload.item);
        setLabelsInput((payload.item.labels ?? []).join(", "));
      }
    }

    void loadBugDetail();
  }, [selectedBugId]);

  async function saveErrorStatus() {
    if (!selectedErrorId || !errorDetail) {
      return;
    }

    setSavingError(true);
    const response = await fetch(`/api/admin/errors/${selectedErrorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: errorDetail.status
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; item?: ErrorItem };
    setSavingError(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not update error status.");
      return;
    }

    toast.success("Error status updated.");
    if (payload.item) {
      setErrorDetail(payload.item);
    }
    await load();
  }

  async function saveBugFeedback() {
    if (!selectedBugId || !bugDetail) {
      return;
    }

    setSavingBug(true);
    const response = await fetch(`/api/admin/feedback/${selectedBugId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: bugDetail.status,
        priority: bugDetail.priority,
        adminNotes: bugDetail.adminNotes ?? "",
        labels: labelsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; item?: BugFeedbackItem };
    setSavingBug(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not update bug feedback.");
      return;
    }

    toast.success("Bug feedback updated.");
    if (payload.item) {
      setBugDetail(payload.item);
      setLabelsInput((payload.item.labels ?? []).join(", "));
    }
    await load();
  }

  const hasIssues = errorItems.length > 0 || bugFeedbackItems.length > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Errors"
        title="Bug center"
        description="Separate user-reported bugs from system-detected issues, then run a manual analysis pass to see what needs attention first."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh now"}
            </Button>
            <Button onClick={() => void analyzeIssues()} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Start analysis"}
            </Button>
            <Link href="/admin/feedback">
              <Button variant="outline">Open full feedback queue</Button>
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Tracked issues" value={summary.totalTrackedIssues} helper="Errors plus feedback reports marked as bugs." />
        <AdminStatCard label="Unresolved" value={summary.unresolvedIssues} helper={`${summary.unresolvedErrorCount} system issues, ${summary.unresolvedBugFeedbackCount} feedback bugs.`} />
        <AdminStatCard label="Resolved" value={summary.resolvedIssues} helper={`${summary.resolvedErrorCount} system issues, ${summary.resolvedBugFeedbackCount} feedback bugs.`} />
        <AdminStatCard label="System issues" value={summary.runtimeErrorCount} helper="Grouped runtime and render failures." />
        <AdminStatCard label="Feedback bugs" value={summary.bugFeedbackCount} helper="User feedback items whose category is bug." />
      </section>

      <AdminCard>
        <div className="grid gap-4 xl:grid-cols-6">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages, pages, routes, fingerprints" />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged / In review</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </Select>
          <Select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="fatal">Fatal</option>
          </Select>
          <Select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">All error sources</option>
            <option value="server">Server</option>
            <option value="client">Client</option>
            <option value="render">Render</option>
            <option value="unhandled_rejection">Unhandled rejection</option>
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">All feedback priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Filter by userId" />
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Analysis console</p>
            <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Analyze bugs, errors, and issue patterns</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              Run a manual pass across the current filters to surface hotspots, high-risk issues, and the best next steps to take.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--muted-foreground)]">Analysis is manual. Auto-refresh keeps the raw issue tables current.</span>
            <Button onClick={() => void analyzeIssues()} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Start analysis"}
            </Button>
          </div>
        </div>

        {!analysis ? (
          <div className="mt-5 rounded-[22px] border border-dashed border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-6">
            <p className="text-sm font-medium text-[var(--foreground)]">No analysis snapshot yet.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Press <span className="font-medium text-[var(--foreground)]">Start analysis</span> to inspect the currently filtered bugs, errors, and issue hotspots.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-4 py-3">
              <div className="text-sm text-[var(--muted-foreground)]">
                Last analyzed on {new Date(analysis.generatedAt).toLocaleString()}
              </div>
              <div className="text-sm">
                {analysisIsStale ? (
                  <span className="text-amber-300">Filters changed or fresh data arrived. Run analysis again for an updated snapshot.</span>
                ) : (
                  <span className="text-emerald-300">Analysis matches the current filter set.</span>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="surface-card rounded-[22px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Active system issues</p>
                <p className="mt-3 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{analysis.summary.activeSystemIssueCount}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">System-detected error groups in this analysis scope.</p>
              </div>
              <div className="surface-card rounded-[22px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Active feedback bugs</p>
                <p className="mt-3 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{analysis.summary.activeFeedbackBugCount}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">User-reported bug feedback still needing review.</p>
              </div>
              <div className="surface-card rounded-[22px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">High-risk findings</p>
                <p className="mt-3 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{analysis.summary.highRiskFindingCount}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Findings with the strongest severity, priority, and recency signals.</p>
              </div>
              <div className="surface-card rounded-[22px] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Hotspots</p>
                <p className="mt-3 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{analysis.summary.hotspotCount}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Pages or surfaces where issues are stacking up.</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="surface-card rounded-[24px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Analyzed bugs & errors</p>
                    <h3 className="mt-2 font-headline text-2xl tracking-[-0.03em] text-[var(--foreground)]">Priority queue</h3>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{analysis.findings.length} surfaced</span>
                </div>

                <div className="mt-4 space-y-3">
                  {analysis.findings.length ? (
                    analysis.findings.map((item) => (
                      <div key={`${item.kind}-${item.id}`} className="rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[color:var(--control-bg)] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                              {formatAnalysisKind(item.kind)}
                            </span>
                            <span className="text-xs text-[var(--muted-foreground)]">{item.severityOrPriority}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">Score {item.score}</span>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">{item.status}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.title}</p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">{item.reason}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
                          <span>{item.location}</span>
                          <span>{new Date(item.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">No active findings were surfaced for the current filters.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="surface-card rounded-[24px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Issue hotspots</p>
                      <h3 className="mt-2 font-headline text-2xl tracking-[-0.03em] text-[var(--foreground)]">Where problems cluster</h3>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">{analysis.hotspots.length} hotspots</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {analysis.hotspots.length ? (
                      analysis.hotspots.map((item) => (
                        <div key={item.location} className="rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-4">
                          <p className="text-sm font-medium text-[var(--foreground)]">{item.location}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
                            <span>{item.totalItems} active issues</span>
                            <span>{item.errorCount} system</span>
                            <span>{item.feedbackCount} feedback</span>
                          </div>
                          <p className="mt-2 text-xs text-[var(--muted-foreground)]">Last seen {new Date(item.latestSeenAt).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No hotspots detected in this analysis run.</p>
                    )}
                  </div>
                </div>

                <div className="surface-card rounded-[24px] p-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Recommended next steps</p>
                  <h3 className="mt-2 font-headline text-2xl tracking-[-0.03em] text-[var(--foreground)]">What to do next</h3>

                  <div className="mt-4 space-y-3">
                    {analysis.recommendedActions.map((item) => (
                      <div key={`${item.urgency}-${item.title}`} className={`rounded-[20px] border p-4 ${urgencyClasses(item.urgency)}`}>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 opacity-85">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminCard>

      {!hasIssues ? (
        <AdminEmptyState title="No tracked issues found" description="There are no matching runtime errors or bug feedback reports for the current filters." />
      ) : (
        <>
          <AdminCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[color:var(--panel-border)] px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Analyzed system issues</p>
                <h2 className="mt-1 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">System-detected bugs & errors</h2>
              </div>
              <span className="text-sm text-[var(--muted-foreground)]">{errorItems.length} matching items</span>
            </div>
            {errorItems.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[color:var(--surface-low)] text-[var(--tertiary-foreground)]">
                    <tr>
                      <th className="px-5 py-4 font-medium">Severity</th>
                      <th className="px-5 py-4 font-medium">Message</th>
                      <th className="px-5 py-4 font-medium">Surface</th>
                      <th className="px-5 py-4 font-medium">Occurrences</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorItems.map((item) => (
                      <tr key={item._id} className="border-t border-[color:var(--panel-border)]">
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.severity}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{item.message}</td>
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.route || item.url || item.source}</td>
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.occurrences}</td>
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.status}</td>
                        <td className="px-5 py-4">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedErrorId(item._id)}>
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No system-detected bugs or errors match the current filters.</div>
            )}
          </AdminCard>

          <AdminCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[color:var(--panel-border)] px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Feedback-reported bugs</p>
                <h2 className="mt-1 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">User-reported bug feedback</h2>
              </div>
              <span className="text-sm text-[var(--muted-foreground)]">{bugFeedbackItems.length} matching items</span>
            </div>
            {bugFeedbackItems.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[color:var(--surface-low)] text-[var(--tertiary-foreground)]">
                    <tr>
                      <th className="px-5 py-4 font-medium">Priority</th>
                      <th className="px-5 py-4 font-medium">Message</th>
                      <th className="px-5 py-4 font-medium">Reporter</th>
                      <th className="px-5 py-4 font-medium">Page</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bugFeedbackItems.map((item) => (
                      <tr key={item._id} className="border-t border-[color:var(--panel-border)]">
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.priority}</td>
                        <td className="px-5 py-4 text-[var(--foreground)]">{item.message.slice(0, 140)}</td>
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.email || item.name || "Anonymous"}</td>
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.pageUrl || "Landing page"}</td>
                        <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.status}</td>
                        <td className="px-5 py-4">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedBugId(item._id)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-sm text-[var(--muted-foreground)]">No feedback-reported bugs match the current filters.</div>
            )}
          </AdminCard>
        </>
      )}

      <Dialog
        open={Boolean(selectedErrorId)}
        onClose={() => setSelectedErrorId(null)}
        title="Error group detail"
        description="Grouped by fingerprint with the most recent captured occurrences and admin-controlled lifecycle status."
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">Updating status affects this grouped fingerprint, not just one occurrence.</p>
            <Button onClick={saveErrorStatus} disabled={!errorDetail || savingError}>
              {savingError ? "Saving..." : "Save status"}
            </Button>
          </div>
        }
      >
        {!errorDetail ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading error details...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Severity</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{errorDetail.severity}</p>
              </AdminCard>
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Source</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{errorDetail.source}</p>
              </AdminCard>
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Occurrences</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{errorDetail.occurrences}</p>
              </AdminCard>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
                <Select
                  value={errorDetail.status}
                  onChange={(event) =>
                    setErrorDetail((current) =>
                      current ? { ...current, status: event.target.value as ErrorItem["status"] } : current
                    )
                  }
                >
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="ignored">Ignored</option>
                </Select>
              </label>
            </div>

            <AdminCard className="p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">{errorDetail.message}</p>
              <p className="mt-2 font-mono text-xs text-[var(--muted-foreground)]">{errorDetail.fingerprint}</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">{errorDetail.route || errorDetail.url || "No route or URL captured"}</p>
            </AdminCard>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Recent occurrences</p>
              <div className="mt-3 space-y-3">
                {(errorDetail.events ?? []).length ? (
                  errorDetail.events!.map((event, index) => (
                    <AdminCard key={String(event._id ?? index)} className="p-4">
                      <p className="text-xs text-[var(--muted-foreground)]">{event.seenAt ? new Date(String(event.seenAt)).toLocaleString() : "Unknown time"}</p>
                      <p className="mt-2 text-sm text-[var(--foreground)]">{String(event.message ?? "Unknown event")}</p>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                        {String(event.route ?? event.url ?? event.userEmail ?? "No extra context")}
                      </p>
                    </AdminCard>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No event drilldown payloads were stored for this error yet.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Raw error group</p>
              <div className="mt-3">
                <AdminJsonBlock value={errorDetail} />
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(selectedBugId)}
        onClose={() => setSelectedBugId(null)}
        title="Bug feedback detail"
        description="Review the reported bug, update its status and priority, and keep internal notes attached to the report."
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">This uses the same feedback status flow as the full feedback queue.</p>
            <Button onClick={saveBugFeedback} disabled={!bugDetail || savingBug}>
              {savingBug ? "Saving..." : "Save bug feedback"}
            </Button>
          </div>
        }
      >
        {!bugDetail ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading bug feedback details...</p>
        ) : (
          <div className="space-y-6">
            <AdminCard className="p-4">
              <p className="text-sm leading-7 text-[var(--foreground)]">{bugDetail.message}</p>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">{bugDetail.email || bugDetail.name || "Anonymous reporter"}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{bugDetail.pageUrl || "Landing page"}</p>
            </AdminCard>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
                <Select
                  value={bugDetail.status}
                  onChange={(event) =>
                    setBugDetail((current) =>
                      current ? { ...current, status: event.target.value as BugFeedbackItem["status"] } : current
                    )
                  }
                >
                  <option value="open">Open</option>
                  <option value="in_review">In review</option>
                  <option value="resolved">Resolved</option>
                  <option value="ignored">Ignored</option>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Priority</span>
                <Select
                  value={bugDetail.priority}
                  onChange={(event) =>
                    setBugDetail((current) =>
                      current ? { ...current, priority: event.target.value as BugFeedbackItem["priority"] } : current
                    )
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Labels</span>
              <Input value={labelsInput} onChange={(event) => setLabelsInput(event.target.value)} placeholder="landing, auth, ui" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Admin notes</span>
              <Textarea
                className="min-h-[180px]"
                value={bugDetail.adminNotes ?? ""}
                onChange={(event) =>
                  setBugDetail((current) => (current ? { ...current, adminNotes: event.target.value } : current))
                }
              />
            </label>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Raw bug feedback</p>
              <div className="mt-3">
                <AdminJsonBlock value={bugDetail} />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
