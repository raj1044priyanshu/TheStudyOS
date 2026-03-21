export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { getEmailConfigDiagnostics, verifyEmailTransport } from "@/lib/email";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { getPusherClientConfig } from "@/lib/pusher-client";
import { isPusherConfigured, pusherServer } from "@/lib/pusher";

const ENV_KEYS = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APP_URL",
  "EMAIL_FROM",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_SECURE",
  "CRON_SECRET",
  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",
  "PUSHER_CLUSTER",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER"
];

export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const emailDiagnostics = getEmailConfigDiagnostics();
    let emailHealth: { ok: boolean; error?: string } = { ok: emailDiagnostics.ok };

    if (emailDiagnostics.ok) {
      try {
        await verifyEmailTransport();
      } catch (error) {
        emailHealth = {
          ok: false,
          error: error instanceof Error ? error.message : "SMTP verification failed"
        };
      }
    } else {
      emailHealth = {
        ok: false,
        error: emailDiagnostics.diagnostics.join(" ")
      };
    }

    const pusherClientConfig = getPusherClientConfig();

    return Response.json({
      database: {
        ok: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState
      },
      email: {
        ...emailHealth,
        diagnostics: emailDiagnostics.diagnostics,
        provider: emailDiagnostics.provider
      },
      pusher: {
        ok: isPusherConfigured() && Boolean(pusherServer) && Boolean(pusherClientConfig),
        serverReady: Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER),
        clientReady: Boolean(pusherClientConfig),
        cluster: process.env.PUSHER_CLUSTER ?? process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? null
      },
      env: ENV_KEYS.map((key) => ({
        key,
        ready: Boolean(process.env[key]?.trim())
      }))
    });
  } catch (error) {
    return routeError("admin:health:get", error);
  }
}
