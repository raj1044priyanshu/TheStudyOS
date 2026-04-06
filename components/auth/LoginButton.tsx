"use client";

import { signIn } from "next-auth/react";
import { IconArrowRight, IconBrandGoogle } from "@tabler/icons-react";
import { markPendingSignIn, trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  async function handleSignIn() {
    markPendingSignIn("/dashboard");
    trackEvent("sign_in_click", {
      provider: "google",
      destination: "/dashboard"
    });
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <Button className="mt-6 w-full justify-between" size="lg" onClick={() => void handleSignIn()}>
      <span className="flex items-center gap-2">
        <IconBrandGoogle className="h-4 w-4" />
        Continue with Google
      </span>
      <IconArrowRight className="h-4 w-4" />
    </Button>
  );
}
