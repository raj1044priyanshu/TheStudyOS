"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminCard, AdminEmptyState, AdminJsonBlock, AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initialUserId?: string;
}

interface FeedbackItem {
  _id: string;
  category: string;
  status: "open" | "in_review" | "resolved" | "ignored";
  priority: "low" | "medium" | "high" | "urgent";
  rating?: number | null;
  message: string;
  name?: string;
  email?: string;
  pageUrl?: string;
  createdAt?: string;
  labels?: string[];
  adminNotes?: string;
}

export function AdminFeedback({ initialUserId = "" }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("");
  const [reporter, setReporter] = useState("");
  const [userId, setUserId] = useState(initialUserId);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FeedbackItem | null>(null);
  const [labelsInput, setLabelsInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (rating) params.set("rating", rating);
      if (reporter) params.set("reporter", reporter);
      if (userId) params.set("userId", userId);

      const response = await fetch(`/api/admin/feedback?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({ items: [] }))) as { items: FeedbackItem[] };
      if (response.ok) {
        setItems(payload.items ?? []);
      }
    }

    void load();
  }, [category, query, rating, reporter, status, userId]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedId) {
        setDetail(null);
        setLabelsInput("");
        return;
      }

      const response = await fetch(`/api/admin/feedback/${selectedId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { item?: FeedbackItem } | null;
      if (response.ok && payload?.item) {
        setDetail(payload.item);
        setLabelsInput((payload.item.labels ?? []).join(", "));
      }
    }

    void loadDetail();
  }, [selectedId]);

  async function saveFeedback() {
    if (!selectedId || !detail) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/admin/feedback/${selectedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: detail.status,
        priority: detail.priority,
        adminNotes: detail.adminNotes ?? "",
        labels: labelsInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; item?: FeedbackItem };
    setSaving(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not update feedback.");
      return;
    }

    toast.success("Feedback updated.");
    if (payload.item) {
      setDetail(payload.item);
      setItems((current) => current.map((item) => (item._id === selectedId ? payload.item! : item)));
      setLabelsInput((payload.item.labels ?? []).join(", "));
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Feedback"
        title="Feedback queue"
        description="Review landing-page submissions, inspect context, add internal notes, and move reports through the workflow."
      />

      <AdminCard>
        <div className="grid gap-4 xl:grid-cols-6">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search feedback" />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </Select>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Feature request</option>
            <option value="content">Content</option>
            <option value="design">Design</option>
            <option value="performance">Performance</option>
            <option value="support">Support</option>
            <option value="other">Other</option>
          </Select>
          <Select value={rating} onChange={(event) => setRating(event.target.value)}>
            <option value="">All ratings</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </Select>
          <Select value={reporter} onChange={(event) => setReporter(event.target.value)}>
            <option value="">All reporters</option>
            <option value="authenticated">Authenticated</option>
            <option value="anonymous">Anonymous</option>
          </Select>
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Filter by userId" />
        </div>
      </AdminCard>

      {!items.length ? (
        <AdminEmptyState title="No feedback found" description="Try relaxing the filters or wait for new submissions from the main site." />
      ) : (
        <AdminCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color:var(--surface-low)] text-[var(--tertiary-foreground)]">
                <tr>
                  <th className="px-5 py-4 font-medium">Category</th>
                  <th className="px-5 py-4 font-medium">Message</th>
                  <th className="px-5 py-4 font-medium">Reporter</th>
                  <th className="px-5 py-4 font-medium">Priority</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-[color:var(--panel-border)]">
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.category}</td>
                    <td className="px-5 py-4 text-[var(--foreground)]">{item.message.slice(0, 120)}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.email || item.name || "Anonymous"}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.priority}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.status}</td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedId(item._id)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <Dialog
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title="Feedback detail"
        description="Inspect the full submission, update workflow fields, and keep internal admin notes attached to the report."
        size="xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">Status, priority, notes, and labels all persist to the feedback record.</p>
            <Button onClick={saveFeedback} disabled={!detail || saving}>
              {saving ? "Saving..." : "Save feedback"}
            </Button>
          </div>
        }
      >
        {!detail ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading feedback details...</p>
        ) : (
          <div className="space-y-6">
            <AdminCard className="p-4">
              <p className="text-sm leading-7 text-[var(--foreground)]">{detail.message}</p>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">{detail.email || detail.name || "Anonymous reporter"}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail.pageUrl || "No page URL captured"}</p>
            </AdminCard>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
                <Select
                  value={detail.status}
                  onChange={(event) => setDetail((current) => (current ? { ...current, status: event.target.value as FeedbackItem["status"] } : current))}
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
                  value={detail.priority}
                  onChange={(event) =>
                    setDetail((current) => (current ? { ...current, priority: event.target.value as FeedbackItem["priority"] } : current))
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
              <Input value={labelsInput} onChange={(event) => setLabelsInput(event.target.value)} placeholder="bug, landing, ui" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Admin notes</span>
              <Textarea
                className="min-h-[180px]"
                value={detail.adminNotes ?? ""}
                onChange={(event) => setDetail((current) => (current ? { ...current, adminNotes: event.target.value } : current))}
              />
            </label>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Raw payload</p>
              <div className="mt-3">
                <AdminJsonBlock value={detail} />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
