import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/features/", "/resources", "/resources/", "/blog", "/blog/", "/study-guides", "/study-guides/"],
        disallow: ["/api/", "/dashboard/", "/admin/", "/login", "/onboarding", "/welcome", "/suspended"]
      }
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`
  };
}
