"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "react-hot-toast";

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "18px",
            border: "1px solid var(--panel-border)",
            backdropFilter: "blur(24px) saturate(180%)",
            background: "var(--glass-surface-strong)",
            color: "var(--foreground)",
            boxShadow: "var(--glass-shadow-deep)"
          }
        }}
      />
    </ThemeProvider>
  );
}
