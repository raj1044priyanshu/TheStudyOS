"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminEmptyState, AdminJsonBlock, AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AuditItem {
  _id: string;
  action: string;
  targetModel: string;
  targetId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  createdAt?: string;
}

export function AdminAudit() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [selected, setSelected] = useState<AuditItem | null>(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (query) params.set("q", query);

      const response = await fetch(`/api/admin/audit?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({ items: [] }))) as { items: AuditItem[] };
      if (response.ok) {
        setItems(payload.items ?? []);
      }
    }

    void load();
  }, [query]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit"
        title="Admin audit trail"
        description="Every mutation from the control plane is recorded here with target metadata and optional before/after payloads."
      />

      <AdminCard>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, target model, target id, or summary" />
      </AdminCard>

      {!items.length ? (
        <AdminEmptyState title="No audit entries found" description="Admin mutations will appear here as soon as the control plane changes data." />
      ) : (
        <AdminCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color:var(--surface-low)] text-[var(--tertiary-foreground)]">
                <tr>
                  <th className="px-5 py-4 font-medium">Action</th>
                  <th className="px-5 py-4 font-medium">Target</th>
                  <th className="px-5 py-4 font-medium">Summary</th>
                  <th className="px-5 py-4 font-medium">Created</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-[color:var(--panel-border)]">
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{item.action}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {item.targetModel}
                      {item.targetId ? ` / ${item.targetId}` : ""}
                    </td>
                    <td className="px-5 py-4 text-[var(--foreground)]">{item.summary}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown"}
                    </td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(item)}>
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
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Audit detail"
        description="The audit payload shows what the admin action targeted and any before/after snapshots captured by the API."
        size="xl"
      >
        {!selected ? null : (
          <div className="space-y-6">
            <AdminCard className="p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{selected.action}</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">{selected.summary}</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">{selected.targetModel}</p>
            </AdminCard>
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">Before</p>
                <AdminJsonBlock value={selected.before ?? null} />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">After</p>
                <AdminJsonBlock value={selected.after ?? null} />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
