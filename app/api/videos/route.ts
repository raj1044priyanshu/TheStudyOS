import { NextResponse } from "next/server";
import { searchYoutubeVideos } from "@/lib/youtube";
import { requireUser, applyRouteRateLimit } from "@/lib/api";

export async function GET(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`videos:${authResult.userId}`);
  if (rate) return rate;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const duration = searchParams.get("duration")?.trim() ?? "all";
  if (!query) {
    return NextResponse.json({ videos: [] });
  }

  const videos = await searchYoutubeVideos(query);
  const filtered = videos.filter((video) => {
    if (duration === "short") return video.durationSeconds > 0 && video.durationSeconds < 240;
    if (duration === "medium") return video.durationSeconds >= 240 && video.durationSeconds <= 1200;
    if (duration === "long") return video.durationSeconds > 1200;
    return true;
  });
  return NextResponse.json({ videos: filtered });
}
