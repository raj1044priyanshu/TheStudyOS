import axios from "axios";

const YOUTUBE_URL = "https://www.googleapis.com/youtube/v3/search";

interface VideoResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number;
}

export async function searchYoutubeVideos(query: string): Promise<VideoResult[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("YOUTUBE_API_KEY is missing");
  }

  const { data } = await axios.get(YOUTUBE_URL, {
    params: {
      key,
      q: `${query} educational lecture tutorial`,
      part: "snippet",
      type: "video",
      relevanceLanguage: "en",
      safeSearch: "strict",
      maxResults: 12
    }
  });

  const mapped: VideoResult[] = (data.items ?? []).map(
    (item: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails?: {
          high?: { url: string };
          default?: { url: string };
        };
      };
    }) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    durationSeconds: 0
    })
  );

  const ids = mapped.map((item: VideoResult) => item.videoId).filter(Boolean).join(",");
  if (!ids) return mapped;

  const detailResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
    params: {
      key,
      id: ids,
      part: "contentDetails"
    }
  });

  const durationMap = new Map<string, number>();
  for (const item of (detailResponse.data.items ?? []) as Array<{ id: string; contentDetails?: { duration?: string } }>) {
    const duration = item.contentDetails?.duration as string | undefined;
    if (!duration) continue;
    // Parse ISO 8601 duration (PT#H#M#S) to seconds.
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) continue;
    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);
    durationMap.set(item.id, hours * 3600 + minutes * 60 + seconds);
  }

  return mapped.map((item: VideoResult) => ({
    ...item,
    durationSeconds: durationMap.get(item.videoId) ?? 0
  }));
}
