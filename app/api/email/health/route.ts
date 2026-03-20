import { NextResponse } from "next/server";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { getEmailConfigDiagnostics, verifyEmailTransport } from "@/lib/email";

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`email-health:${authResult.userId}`);
  if (rate) return rate;

  const diagnostics = getEmailConfigDiagnostics();
  if (!diagnostics.ok) {
    return NextResponse.json(
      {
        ok: false,
        provider: diagnostics.provider,
        error: "SMTP configuration is invalid",
        diagnostics: diagnostics.diagnostics
      },
      { status: 400 }
    );
  }

  try {
    const verified = await verifyEmailTransport();
    return NextResponse.json({ ok: true, provider: verified.provider, diagnostics: verified.diagnostics });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: diagnostics.provider,
        error: error instanceof Error ? error.message : "SMTP verification failed",
        diagnostics: diagnostics.diagnostics
      },
      { status: 502 }
    );
  }
}
