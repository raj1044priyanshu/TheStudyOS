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
    "@type": "EducationalOrganization",
    name: siteConfig.name,
    url: buildAbsoluteUrl("/"),
    logo: buildAbsoluteUrl("/studyos-logo.svg"),
    description: siteConfig.description,
    sameAs: [
      "https://twitter.com/studyos_app",
      "https://instagram.com/studyos.app"
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: buildAbsoluteUrl("/"),
      availableLanguage: "English"
    }
  };
}

export function createWebsiteJsonLd(): JsonLdBase & Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: buildAbsoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${buildAbsoluteUrl("/study-guides")}?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
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
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1200",
      bestRating: "5",
      worstRating: "1"
    },
    featureList: "AI Notes Generation, Quiz Generator, Study Planner, Flashcard Revision, Mind Maps, Doubt Solver, Focus Timer, Progress Tracking, Study Room Collaboration",
    screenshot: buildAbsoluteUrl("/opengraph-image")
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
