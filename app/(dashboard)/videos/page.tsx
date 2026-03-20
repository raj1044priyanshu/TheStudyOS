"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Select } from "@/components/ui/select";

interface Video {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export default function VideosPage() {
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("all");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const response = await fetch(`/api/videos?q=${encodeURIComponent(query)}&duration=${duration}`);
    const data = await response.json();
    setVideos(data.videos ?? []);
    setLoading(false);
    window.dispatchEvent(new CustomEvent("tour:videos-searched"));
  }

  function useExample() {
    setQuery("Laws of motion class 11");
    setDuration("medium");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Library</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Videos</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Search for educational videos in a quieter browsing experience with quick duration filters.
        </p>
      </div>

      <div className="glass-card flex flex-wrap gap-2 p-5">
        <Input
          data-tour-id="videos-query-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search videos"
          className="max-w-lg"
        />
        <Select value={duration} onChange={(event) => setDuration(event.target.value)} className="w-40">
          <option value="all">All</option>
          <option value="short">Short (&lt;4m)</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </Select>
        <Button data-tour-id="videos-example-fill" type="button" variant="ghost" onClick={useExample}>
          Use Example
        </Button>
        <Button data-tour-id="videos-search-button" onClick={search} disabled={loading || !query.trim()}>
          Search
        </Button>
      </div>

      {videos.length === 0 ? (
        <EmptyState title="No videos" description="Search for a topic to get educational recommendations." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <Link key={video.videoId} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" className="group glass-card overflow-hidden p-0">
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
