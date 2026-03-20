"use client";

import { signIn } from "next-auth/react";
import { IconArrowRight, IconBrandGoogle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  return (
    <Button className="mt-6 w-full justify-between" size="lg" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
      <span className="flex items-center gap-2">
        <IconBrandGoogle className="h-4 w-4" />
        Continue with Google
      </span>
      <IconArrowRight className="h-4 w-4" />
    </Button>
  );
}
