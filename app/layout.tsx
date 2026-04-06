/* eslint-disable @next/next/no-page-custom-font */
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteAlertBanner } from "@/components/shared/SiteAlertBanner";
import { buildAbsoluteUrl, getSiteUrl, shouldLoadGoogleAnalytics, siteConfig } from "@/lib/site-config";
import "driver.js/dist/driver.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.title,
    template: "%s | StudyOS"
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: buildAbsoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "StudyOS preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [buildAbsoluteUrl("/twitter-image")]
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? {
          "msvalidate.01": process.env.BING_SITE_VERIFICATION
        }
      : undefined
  },
  category: siteConfig.category,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#18161f" }
  ]
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const analyticsEnabled = shouldLoadGoogleAnalytics();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Just+Another+Hand&display=swap" rel="stylesheet" />
      </head>
      <body
        style={
          {
            "--font-heading": '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
            "--font-body":
              '"Avenir Next", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            "--font-handwritten": '"Just Another Hand", "Segoe Print", "Bradley Hand", cursive',
            "--font-caveat": '"Segoe Print", "Bradley Hand", cursive',
            "--font-mono": '"SFMono-Regular", "JetBrains Mono", ui-monospace, Menlo, Monaco, Consolas, monospace'
          } as CSSProperties
        }
      >
        <AppProviders>
          <SiteAlertBanner />
          {children}
        </AppProviders>
        {analyticsEnabled ? <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!} /> : null}
      </body>
    </html>
  );
}
