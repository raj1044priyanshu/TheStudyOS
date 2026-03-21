"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { IconBell } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { FloatingPanel, FloatingPanelScrollArea } from "@/components/ui/floating-panel";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

interface Props {
  align?: "left" | "right";
  className?: string;
}

export function NotificationBell({ align = "right", className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoading(false);
      return;
    }
    setItems(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => {
      void loadNotifications();
    }, 45_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent("tour:notifications-opened"));
    }
  }, [open]);

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
    setUnreadCount(data.unreadCount ?? 0);
  }

  async function markSingleRead(id: string) {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    }).catch(() => null);
  }

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        data-tour-id="topbar-notifications"
        size="icon"
        variant="outline"
        className={cn("relative flex items-center justify-center rounded-full p-0", className)}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open notifications"
      >
        <IconBell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[color:var(--glass-surface-strong)]" />
        ) : null}
      </Button>

      {open ? (
        <FloatingPanel
          className={cn(
            "absolute top-14 z-50 w-[min(92vw,360px)]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="mb-2 flex items-center justify-between px-2 pb-2 pt-1">
            <p className="font-headline text-[26px] tracking-[-0.02em] text-[var(--foreground)]">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" onClick={() => void markAllRead()} className="text-xs font-medium text-[#7B6CF6]">
                Mark all read
              </button>
            ) : null}
          </div>

          {loading ? <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">Loading...</p> : null}
          {!loading && !hasItems ? <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">No notifications yet.</p> : null}

          {!loading && hasItems ? (
            <FloatingPanelScrollArea className="max-h-[min(60vh,24rem)] space-y-2">
              {items.map((item) => {
                const content = (
                  <div
                    className={cn(
                      "rounded-[18px] border px-3 py-3 transition",
                      item.read
                        ? "surface-card"
                        : "border-[color:var(--secondary-button-border)] bg-[color:var(--secondary-button-bg)]"
                    )}
                  >
                    <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                    <p className="text-xs leading-5 text-[var(--muted-foreground)]">{item.message}</p>
                    <p className="mt-1 text-[11px] text-[var(--tertiary-foreground)]">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                );

                if (item.actionUrl) {
                  return (
                    <Link
                      key={item.id}
                      href={item.actionUrl}
                      className="block"
                      onClick={() => {
                        if (!item.read) {
                          void markSingleRead(item.id);
                        }
                        setOpen(false);
                      }}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    type="button"
                    key={item.id}
                    className="block w-full text-left"
                    onClick={() => {
                      if (!item.read) {
                        void markSingleRead(item.id);
                      }
                    }}
                  >
                    {content}
                  </button>
                );
              })}
            </FloatingPanelScrollArea>
          ) : null}
        </FloatingPanel>
      ) : null}
    </div>
  );
}
