"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminCard, AdminEmptyState, AdminJsonBlock, AdminPageHeader } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: "student" | "tester" | "admin";
  status: "active" | "suspended";
  streak?: number;
  totalNotesGenerated?: number;
  totalQuizzesTaken?: number;
  totalXP?: number;
  lastActive?: string;
  createdAt?: string;
}

interface UserDetailPayload {
  user: Record<string, unknown>;
  stats: {
    noteCount: number;
    quizCount: number;
    planCount: number;
    feedbackCount: number;
    errorCount: number;
  };
  relatedLinks: Array<{ label: string; href: string }>;
}

export function AdminUsers() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetailPayload | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (role) params.set("role", role);

      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({ users: [] }))) as { users: UserRow[] };
      if (response.ok) {
        setUsers(payload.users ?? []);
      }
    }

    void load();
  }, [query, role, status]);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedUserId) {
        setDetail(null);
        return;
      }

      const response = await fetch(`/api/admin/users/${selectedUserId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as UserDetailPayload | null;
      if (response.ok && payload) {
        setDetail(payload);
      }
    }

    void loadDetail();
  }, [selectedUserId]);

  async function saveUser() {
    if (!selectedUserId || !detail) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/admin/users/${selectedUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: detail.user.role,
        status: detail.user.status
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; user?: Record<string, unknown> };
    setSaving(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not update user.");
      return;
    }

    toast.success("User updated.");
    setDetail((current) => (current ? { ...current, user: payload.user ?? current.user } : current));
    setUsers((current) =>
      current.map((user) =>
        user._id === selectedUserId
          ? {
              ...user,
              role: String(payload.user?.role ?? user.role) as UserRow["role"],
              status: String(payload.user?.status ?? user.status) as UserRow["status"]
            }
          : user
      )
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Users"
        title="User management"
        description="Search students, inspect their workspace activity, assign tester or admin access, and suspend accounts when needed."
      />

      <AdminCard>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
          <Select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="tester">Tester</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </AdminCard>

      {!users.length ? (
        <AdminEmptyState title="No users matched these filters" description="Adjust the search, role, or status filters to widen the list." />
      ) : (
        <AdminCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color:var(--surface-low)] text-[var(--tertiary-foreground)]">
                <tr>
                  <th className="px-5 py-4 font-medium">User</th>
                  <th className="px-5 py-4 font-medium">Role</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Notes</th>
                  <th className="px-5 py-4 font-medium">Quizzes</th>
                  <th className="px-5 py-4 font-medium">Last active</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-[color:var(--panel-border)]">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{user.name || "Unnamed user"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{user.role}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{user.status}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{user.totalNotesGenerated ?? 0}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{user.totalQuizzesTaken ?? 0}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{user.lastActive ? new Date(user.lastActive).toLocaleString() : "Never"}</td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedUserId(user._id)}>
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
        open={Boolean(selectedUserId)}
        onClose={() => setSelectedUserId(null)}
        title="User detail"
        description="Manage the user account, review engagement metrics, and jump directly into related resources."
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">Role and status updates are written to the admin audit log.</p>
            <Button onClick={saveUser} disabled={!detail || saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        }
      >
        {!detail ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading user details...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Role</span>
                <Select
                  value={String(detail.user.role ?? "student")}
                  onChange={(event) =>
                    setDetail((current) =>
                      current ? { ...current, user: { ...current.user, role: event.target.value } } : current
                    )
                  }
                >
                  <option value="student">Student</option>
                  <option value="tester">Tester</option>
                  <option value="admin">Admin</option>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
                <Select
                  value={String(detail.user.status ?? "active")}
                  onChange={(event) =>
                    setDetail((current) =>
                      current ? { ...current, user: { ...current.user, status: event.target.value } } : current
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Notes</p>
                <p className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{detail.stats.noteCount}</p>
              </AdminCard>
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Quizzes</p>
                <p className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{detail.stats.quizCount}</p>
              </AdminCard>
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Plans</p>
                <p className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{detail.stats.planCount}</p>
              </AdminCard>
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Feedback</p>
                <p className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{detail.stats.feedbackCount}</p>
              </AdminCard>
              <AdminCard className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Errors</p>
                <p className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{detail.stats.errorCount}</p>
              </AdminCard>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Quick links</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="secondary" size="sm">
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Raw user record</p>
              <div className="mt-3">
                <AdminJsonBlock value={detail.user} />
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
