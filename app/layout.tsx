import type { Metadata } from "next";
import {
  DM_Serif_Display,
  Plus_Jakarta_Sans,
  Caveat,
  JetBrains_Mono
} from "next/font/google";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteAlertBanner } from "@/components/shared/SiteAlertBanner";
import "driver.js/dist/driver.css";
import "./globals.css";

const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], variable: "--font-heading" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });
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
        className={`${dmSerif.variable} ${jakarta.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
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
