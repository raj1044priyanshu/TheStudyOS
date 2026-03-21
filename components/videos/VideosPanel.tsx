"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export function VideosPanel() {
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("all");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const response = await fetch(`/api/videos?q=${encodeURIComponent(query)}&duration=${duration}`);
    const data = await response.json().catch(() => ({}));
    setVideos(data.videos ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search educational videos" className="max-w-lg" />
        <Select value={duration} onChange={(event) => setDuration(event.target.value)} className="w-40">
          <option value="all">All</option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </Select>
        <Button onClick={() => void search()} disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {videos.length === 0 ? (
        <EmptyState title="No videos yet" description="Search for a topic to pull in educational video recommendations." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.videoId}
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              className="group glass-card overflow-hidden p-0"
            >
              <div className="relative overflow-hidden rounded-t-[20px]">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  width={480}
                  height={260}
                  className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">{video.channelTitle}</p>
                <h3 className="mt-2 line-clamp-2 font-headline text-3xl leading-tight tracking-[-0.03em] text-[var(--foreground)]">{video.title}</h3>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">{new Date(video.publishedAt).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
