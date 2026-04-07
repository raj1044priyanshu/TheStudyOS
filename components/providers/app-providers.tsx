"use client";

import { Suspense } from "react";
import { CelebrationCenter } from "@/components/celebrations/CelebrationCenter";
import { GlobalLoadingBar } from "@/components/layout/GlobalLoadingBar";
import { ErrorReporterProvider } from "@/components/providers/ErrorReporterProvider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "react-hot-toast";

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="studyos-theme" disableTransitionOnChange>
      <Suspense fallback={null}>
        <GlobalLoadingBar />
      </Suspense>
      <ErrorReporterProvider>{children}</ErrorReporterProvider>
      <CelebrationCenter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "24px",
            border: "1px solid var(--panel-border)",
            backdropFilter: "blur(26px) saturate(160%)",
            background: "var(--glass-surface-strong)",
            color: "var(--foreground)",
            boxShadow: "var(--glass-shadow-deep)"
          }
        }}
      />
    </ThemeProvider>
  );
}
