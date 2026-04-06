export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { getAiConfigOverview } from "@/lib/ai-provider-config";
import { getEmailConfigDiagnostics, verifyEmailTransport } from "@/lib/email";
import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { getPusherClientConfig } from "@/lib/pusher-client";
import { isPusherConfigured, pusherServer } from "@/lib/pusher";

const ENV_KEYS = [
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APP_URL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "GOOGLE_SITE_VERIFICATION",
  "BING_SITE_VERIFICATION",
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
  "NEXT_PUBLIC_PUSHER_CLUSTER",
  "AI_PROVIDER_ENCRYPTION_KEY",
  "CONTENT_PRIMARY_API_KEY",
  "CONTENT_FALLBACK_API_KEY",
  "CONTENT_PRIMARY_IMAGE_MODEL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-health"
    });
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
    const aiConfig = await getAiConfigOverview();

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
      cloudinary: {
        ok: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
      },
      ai: {
        primary: {
          source: aiConfig.primary.source,
          provider: aiConfig.primary.provider,
          ready: aiConfig.primary.apiKeyPresent,
          fingerprint: aiConfig.primary.keyFingerprint,
          textModel: aiConfig.primary.textModel,
          imageModel: aiConfig.primary.imageModel,
          validationStatus: aiConfig.primary.lastValidationStatus,
          validationMessage: aiConfig.primary.lastValidationMessage
        },
        fallback: {
          source: aiConfig.fallback.source,
          provider: aiConfig.fallback.provider,
          ready: aiConfig.fallback.apiKeyPresent,
          fingerprint: aiConfig.fallback.keyFingerprint,
          textModel: aiConfig.fallback.textModel,
          validationStatus: aiConfig.fallback.lastValidationStatus,
          validationMessage: aiConfig.fallback.lastValidationMessage
        }
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
