"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminCard, AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ResourceOption {
  value: string;
  label: string;
  supportsUserFilter: boolean;
}

interface Props {
  resourceOptions: ResourceOption[];
  initialResource: string;
  initialUserId?: string;
}

interface ResourceListPayload {
  label: string;
  total: number;
  items: Array<Record<string, unknown>>;
}

export function AdminResources({ resourceOptions, initialResource, initialUserId = "" }: Props) {
  const [resource, setResource] = useState(initialResource);
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState(initialUserId);
  const [data, setData] = useState<ResourceListPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createJson, setCreateJson] = useState("{\n  \n}");

  const currentResource = useMemo(
    () => resourceOptions.find((option) => option.value === resource) ?? resourceOptions[0],
    [resource, resourceOptions]
  );

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({ limit: "30" });
      if (query) params.set("q", query);
      if (userId && currentResource?.supportsUserFilter) params.set("userId", userId);

      const response = await fetch(`/api/admin/resources/${resource}?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ResourceListPayload | null;
      if (response.ok && payload) {
        setData(payload);
      }
    }

    void load();
  }, [currentResource?.supportsUserFilter, query, resource, userId]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedId) {
        setSelectedItem(null);
        setRawJson("");
        setConfirmation("");
        return;
      }

      const response = await fetch(`/api/admin/resources/${resource}/${selectedId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { item?: Record<string, unknown> } | null;
      if (response.ok && payload?.item) {
        setSelectedItem(payload.item);
        setRawJson(JSON.stringify(payload.item, null, 2));
      }
    }

    void loadDetail();
  }, [resource, selectedId]);

  const scalarEntries = useMemo(() => {
    if (!selectedItem) {
      return [];
    }

    return Object.entries(selectedItem).filter(([key, value]) => {
      if (["_id", "__v", "createdAt", "updatedAt"].includes(key)) {
        return false;
      }

      return ["string", "number", "boolean"].includes(typeof value) || value === null;
    });
  }, [selectedItem]);

  function updateScalarField(key: string, value: string) {
    setSelectedItem((current) => {
      if (!current) {
        return current;
      }

      const existing = current[key];
      let nextValue: unknown = value;

      if (typeof existing === "number") {
        nextValue = Number(value);
      } else if (typeof existing === "boolean") {
        nextValue = value === "true";
      } else if (existing === null) {
        nextValue = value;
      }

      const next = { ...current, [key]: nextValue };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  }

  async function saveItem() {
    if (!selectedId) {
      return;
    }

    let updates: Record<string, unknown>;
    try {
      updates = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      toast.error("The JSON editor contains invalid JSON.");
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/admin/resources/${resource}/${selectedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ updates })
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; item?: Record<string, unknown> };
    setSaving(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not update the record.");
      return;
    }

    toast.success("Resource updated.");
    setSelectedItem(payload.item ?? null);
    setRawJson(JSON.stringify(payload.item, null, 2));
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (String(item._id) === selectedId ? payload.item ?? item : item))
          }
        : current
    );
  }

  async function deleteItem() {
    if (!selectedId) {
      return;
    }

    setDeleting(true);
    const response = await fetch(`/api/admin/resources/${resource}/${selectedId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmation
      })
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setDeleting(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not delete the record.");
      return;
    }

    toast.success("Resource deleted.");
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => String(item._id) !== selectedId)
          }
        : current
    );
    setSelectedId(null);
  }

  async function createItem() {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(createJson) as Record<string, unknown>;
    } catch {
      toast.error("The create payload is not valid JSON.");
      return;
    }

    const response = await fetch(`/api/admin/resources/${resource}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; item?: Record<string, unknown> };
    if (!response.ok) {
      toast.error(data.error ?? "Could not create the record.");
      return;
    }

    toast.success("Resource created.");
    setCreateOpen(false);
    setCreateJson("{\n  \n}");
    setData((current) =>
      current
        ? {
            ...current,
            items: [data.item ?? {}, ...current.items]
          }
        : current
    );
  }

  const relatedUserId =
    typeof selectedItem?.userId === "string"
      ? selectedItem.userId
      : selectedItem?.userId && typeof selectedItem.userId === "object" && "_id" in selectedItem.userId
        ? String((selectedItem.userId as { _id?: string })._id ?? "")
        : "";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Resources"
        title="Everything in the database"
        description="Browse, inspect, edit, create, and delete records across every tracked StudyOS model from one explorer."
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={!resource}>
            Create record
          </Button>
        }
      />

      <AdminCard>
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
          <Select value={resource} onChange={(event) => setResource(event.target.value)}>
            {resourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current resource" />
          <Input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder={currentResource?.supportsUserFilter ? "Filter by userId" : "User filter unavailable"}
            disabled={!currentResource?.supportsUserFilter}
          />
        </div>
      </AdminCard>

      {!data || !data.items.length ? (
        <AdminEmptyState title="No records found" description="Try a different resource, clear filters, or create a new record for this model." />
      ) : (
        <AdminCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--panel-border)] px-5 py-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{data.label}</p>
              <h2 className="mt-1 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{data.total} records</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color:var(--surface-low)] text-[var(--tertiary-foreground)]">
                <tr>
                  <th className="px-5 py-4 font-medium">ID</th>
                  <th className="px-5 py-4 font-medium">Preview</th>
                  <th className="px-5 py-4 font-medium">Created</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={String(item._id)} className="border-t border-[color:var(--panel-border)]">
                    <td className="px-5 py-4 font-mono text-xs text-[var(--muted-foreground)]">{String(item._id)}</td>
                    <td className="px-5 py-4 text-[var(--foreground)]">
                      {String(
                        item.title ??
                          item.name ??
                          item.subject ??
                          item.topic ??
                          item.email ??
                          item.message ??
                          item.question ??
                          item.roomCode ??
                          item.key ??
                          "Untitled record"
                      )}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : "n/a"}
                    </td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedId(String(item._id))}>
                        Inspect
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
        title={`${currentResource?.label ?? "Resource"} detail`}
        description="Use the scalar form for quick changes or edit the full JSON payload directly. Deletes require typed confirmation."
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setSelectedId(null)}>
              Close
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={saveItem} disabled={!selectedItem || saving}>
                {saving ? "Saving..." : "Save record"}
              </Button>
            </div>
          </div>
        }
      >
        {!selectedItem ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading record details...</p>
        ) : (
          <div className="space-y-6">
            {relatedUserId ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/users?q=${encodeURIComponent(relatedUserId)}`}>
                  <Button size="sm" variant="secondary">
                    Open related user
                  </Button>
                </Link>
                <Link href={`/admin/errors?userId=${encodeURIComponent(relatedUserId)}`}>
                  <Button size="sm" variant="outline">
                    Open related errors
                  </Button>
                </Link>
              </div>
            ) : null}

            {scalarEntries.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {scalarEntries.map(([key, value]) => (
                  <label key={key} className="space-y-2">
                    <span className="text-sm font-medium text-[var(--foreground)]">{key}</span>
                    {typeof value === "boolean" ? (
                      <Select value={String(value)} onChange={(event) => updateScalarField(key, event.target.value)}>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </Select>
                    ) : (
                      <Input value={String(value ?? "")} onChange={(event) => updateScalarField(key, event.target.value)} />
                    )}
                  </label>
                ))}
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Raw JSON editor</p>
              <Textarea className="mt-3 min-h-[320px] font-mono text-xs" value={rawJson} onChange={(event) => setRawJson(event.target.value)} />
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Delete this record</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Type <span className="font-mono">{`DELETE ${resource}:${selectedId}`}</span> to confirm.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="max-w-md" />
                <Button variant="ghost" onClick={deleteItem} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete record"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Create ${currentResource?.label ?? "resource"}`}
        description="Paste a JSON payload that matches the target model. This action is written to the admin audit log."
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createItem}>Create record</Button>
          </div>
        }
      >
        <Textarea className="min-h-[320px] font-mono text-xs" value={createJson} onChange={(event) => setCreateJson(event.target.value)} />
      </Dialog>
    </div>
  );
}
