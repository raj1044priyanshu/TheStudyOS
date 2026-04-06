import type { MetadataRoute } from "next";
import { FEATURE_PAGES } from "@/content/features";
import { getContentEntries } from "@/lib/mdx-content";
import { buildAbsoluteUrl } from "@/lib/site-config";
import { getIndexableStudyGuides } from "@/lib/study-guides";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogEntries, resourceEntries] = await Promise.all([getContentEntries("blog"), getContentEntries("resources")]);
  const now = new Date();

  return [
    {
      url: buildAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: buildAbsoluteUrl("/features"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9
    },
    ...FEATURE_PAGES.map((feature) => ({
      url: buildAbsoluteUrl(`/features/${feature.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8
    })),
    {
      url: buildAbsoluteUrl("/resources"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    ...resourceEntries.map((entry) => ({
      url: buildAbsoluteUrl(entry.path),
      lastModified: new Date(entry.updatedAt ?? entry.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75
    })),
    {
      url: buildAbsoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    ...blogEntries.map((entry) => ({
      url: buildAbsoluteUrl(entry.path),
      lastModified: new Date(entry.updatedAt ?? entry.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.72
    })),
    {
      url: buildAbsoluteUrl("/study-guides"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85
    },
    ...getIndexableStudyGuides().map((guide) => ({
      url: buildAbsoluteUrl(guide.path),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.76
    }))
  ];
}
