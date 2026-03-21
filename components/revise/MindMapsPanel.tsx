"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MindMapsPanel() {
  const [topic, setTopic] = useState("");

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[28px] p-5 md:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Topic planning</p>
        <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Generate a Mind Map</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Mind maps stay full-screen because they need more room. Start here, then open the full canvas to explore the structure.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic" className="max-w-md" />
          <Link href={topic.trim() ? `/dashboard/mindmap?topic=${encodeURIComponent(topic.trim())}` : "/dashboard/mindmap"} className="contents">
            <Button disabled={!topic.trim()}>Open Mind Map</Button>
          </Link>
        </div>
      </section>

      <div className="glass-card rounded-[28px] p-5 text-sm leading-6 text-[var(--muted-foreground)]">
        Generate a map for a topic you are about to study. The full-screen canvas gives you the branch structure without crowding the hub.
      </div>
    </div>
  );
}
