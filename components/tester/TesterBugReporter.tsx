"use client";

import { useState } from "react";
import { IconBug, IconCheck, IconCopy, IconRefresh } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TESTER_BUG_AREAS, TESTER_BUG_REPRODUCIBILITY, TESTER_BUG_SEVERITIES } from "@/lib/tester-issues";

type TesterBugForm = {
  title: string;
  area: (typeof TESTER_BUG_AREAS)[number];
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: (typeof TESTER_BUG_SEVERITIES)[number];
  reproducibility: (typeof TESTER_BUG_REPRODUCIBILITY)[number];
  workaround: string;
};

const DEFAULT_FORM: TesterBugForm = {
  title: "",
  area: "dashboard",
  stepsToReproduce: "",
  expectedBehavior: "",
  actualBehavior: "",
  severity: "major",
  reproducibility: "always",
  workaround: ""
};

const AREA_LABELS: Record<(typeof TESTER_BUG_AREAS)[number], string> = {
  auth: "Authentication",
  dashboard: "Dashboard",
  notes: "Notes",
  planner: "Planner",
  quiz: "Quiz",
  doubts: "Doubts",
  progress: "Progress",
  admin: "Admin",
  other: "Other"
};

const SEVERITY_LABELS: Record<(typeof TESTER_BUG_SEVERITIES)[number], string> = {
  minor: "Minor",
  major: "Major",
  critical: "Critical",
  blocker: "Blocker"
};

const REPRODUCIBILITY_LABELS: Record<(typeof TESTER_BUG_REPRODUCIBILITY)[number], string> = {
  always: "Always",
  intermittent: "Intermittent",
  once: "Once"
};

export function TesterBugReporter() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportId, setReportId] = useState("");
  const [form, setForm] = useState<TesterBugForm>({ ...DEFAULT_FORM });

  function resetForm() {
    setForm({ ...DEFAULT_FORM });
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setOpen(false);
    setReportId("");
  }

  async function copyReportId() {
    if (!reportId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reportId);
      toast.success("Report ID copied.");
    } catch {
      toast.error("Could not copy the report ID.");
    }
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/tester/issues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        pageUrl: window.location.href,
        referrer: document.referrer,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; reportId?: string };
    setSubmitting(false);

    if (!response.ok || !payload.reportId) {
      toast.error(payload.error ?? "Could not submit the bug report.");
      return;
    }

    setReportId(payload.reportId);
    toast.success("Bug report submitted.");
    resetForm();
  }

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-30 md:bottom-6 md:right-6">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-12 gap-2 px-4 shadow-[0_18px_36px_rgba(15,23,42,0.2)]"
          aria-label="Report a bug"
        >
          <IconBug className="h-4 w-4" />
          <span className="hidden min-[380px]:inline">Report bug</span>
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={closeDialog}
        title={reportId ? "Bug report submitted" : "Report a bug"}
        description={
          reportId
            ? "Share this report ID if the issue needs follow-up. The full reproduction details were saved with the report."
            : "Use this form to capture clear reproduction details. Browser and page context are attached automatically."
        }
        size="xl"
        footer={
          reportId ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">No screenshots are required in this workflow. The report already includes page, browser, and environment context.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" onClick={copyReportId}>
                  <IconCopy className="mr-2 h-4 w-4" />
                  Copy report ID
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReportId("");
                    resetForm();
                  }}
                >
                  <IconRefresh className="mr-2 h-4 w-4" />
                  File another
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">Keep the title short and specific. The detailed reproduction fields are what help triage fastest.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" form="tester-bug-report-form" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit bug"}
                </Button>
              </div>
            </div>
          )
        }
        companionPose={reportId ? "cheer" : "thinking"}
      >
        {reportId ? (
          <div className="space-y-5">
            <div className="surface-card rounded-[24px] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <IconCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Your bug report has been saved.</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    If you need to reference it later, use this stable report ID.
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-card rounded-[24px] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Report ID</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-4 py-3 text-sm text-[var(--foreground)]">
                  {reportId}
                </code>
                <Button type="button" variant="secondary" onClick={copyReportId}>
                  <IconCopy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form id="tester-bug-report-form" className="space-y-5" onSubmit={submitReport}>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Title</span>
              <Input
                required
                maxLength={180}
                placeholder="Short summary of the bug"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Area</span>
                <Select value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value as typeof current.area }))}>
                  {TESTER_BUG_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {AREA_LABELS[area]}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Severity</span>
                <Select
                  value={form.severity}
                  onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as typeof current.severity }))}
                >
                  {TESTER_BUG_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {SEVERITY_LABELS[severity]}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Reproducibility</span>
                <Select
                  value={form.reproducibility}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reproducibility: event.target.value as typeof current.reproducibility }))
                  }
                >
                  {TESTER_BUG_REPRODUCIBILITY.map((reproducibility) => (
                    <option key={reproducibility} value={reproducibility}>
                      {REPRODUCIBILITY_LABELS[reproducibility]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Steps to reproduce</span>
              <Textarea
                required
                minLength={8}
                maxLength={5000}
                className="min-h-[140px]"
                placeholder="Step 1, step 2, step 3..."
                value={form.stepsToReproduce}
                onChange={(event) => setForm((current) => ({ ...current, stepsToReproduce: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Expected behavior</span>
                <Textarea
                  required
                  minLength={8}
                  maxLength={5000}
                  className="min-h-[140px]"
                  placeholder="What should have happened?"
                  value={form.expectedBehavior}
                  onChange={(event) => setForm((current) => ({ ...current, expectedBehavior: event.target.value }))}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Actual behavior</span>
                <Textarea
                  required
                  minLength={8}
                  maxLength={5000}
                  className="min-h-[140px]"
                  placeholder="What actually happened?"
                  value={form.actualBehavior}
                  onChange={(event) => setForm((current) => ({ ...current, actualBehavior: event.target.value }))}
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Workaround</span>
              <Textarea
                maxLength={3000}
                className="min-h-[110px]"
                placeholder="Optional: how did you get around it, if at all?"
                value={form.workaround}
                onChange={(event) => setForm((current) => ({ ...current, workaround: event.target.value }))}
              />
            </label>
          </form>
        )}
      </Dialog>
    </>
  );
}
