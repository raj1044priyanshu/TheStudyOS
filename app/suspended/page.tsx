import type { Metadata } from "next";
import Link from "next/link";
import { CompanionPanel } from "@/components/companion/StudyCompanion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";

export const metadata: Metadata = {
  title: "Account suspended",
  robots: {
    index: false,
    follow: false
  }
};

export default function SuspendedPage() {
  return (
    <main id="top" className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl glass-card p-8">
        <Logo compact href="/#top" />
        <div className="mt-6">
          <CompanionPanel
            pose="sad-but-supportive"
            eyebrow="Account Status"
            title="This account is suspended."
            description="Access to the student workspace is currently disabled. If this looks incorrect, contact the StudyOS admin."
            compact
          />
        </div>
        <div className="mt-6">
          <Link href="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
