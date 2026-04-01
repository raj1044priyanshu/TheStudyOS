import type { Metadata } from "next";
import {
  Fraunces,
  Manrope,
  Caveat,
  JetBrains_Mono
} from "next/font/google";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteAlertBanner } from "@/components/shared/SiteAlertBanner";
import "driver.js/dist/driver.css";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-heading" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "StudyOS | Study Workspace",
  description: "A focused workspace for notes, quizzes, planning, and revision.",
  icons: {
    icon: "/icon.svg"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${manrope.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
      >
        <AuthSessionProvider session={session}>
          <AppProviders>
            <SiteAlertBanner />
            {children}
          </AppProviders>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
