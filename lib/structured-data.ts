import { buildAbsoluteUrl, siteConfig } from "@/lib/site-config";

export interface FaqItem {
  question: string;
  answer: string;
}

interface JsonLdBase {
  "@context": "https://schema.org";
  "@type": string;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

export function createOrganizationJsonLd(): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: buildAbsoluteUrl("/"),
    logo: buildAbsoluteUrl("/studyos-logo.svg")
  };
}

export function createWebsiteJsonLd(): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: buildAbsoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en"
  };
}

export function createSoftwareApplicationJsonLd(): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: buildAbsoluteUrl("/"),
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  };
}

export function createWebPageJsonLd({
  name,
  description,
  path
}: {
  name: string;
  description: string;
  path: string;
}): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: buildAbsoluteUrl(path)
  };
}

export function createCollectionPageJsonLd({
  name,
  description,
  path
}: {
  name: string;
  description: string;
  path: string;
}): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: buildAbsoluteUrl(path)
  };
}

export function createArticleJsonLd({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  author = "StudyOS Editorial Team"
}: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
}): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: buildAbsoluteUrl(path),
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: {
      "@type": "Organization",
      name: author
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl("/studyos-logo.svg")
      }
    }
  };
}

export function createFaqJsonLd(items: FaqItem[]): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function createBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path)
    }))
  };
}
