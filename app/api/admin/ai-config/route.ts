export const dynamic = "force-dynamic";

import { z } from "zod";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { buildValidationErrorResponse, requireRateLimitedAdmin, routeError } from "@/lib/api";
import { getAiConfigOverview, upsertAiProviderConfig } from "@/lib/ai-provider-config";
import { hasAiEncryptionSecret } from "@/lib/ai-secrets";

const providerPatchSchema = z.object({
  enabled: z.boolean().optional(),
  apiBase: z.string().optional(),
  apiKey: z.string().optional(),
  resetToEnv: z.boolean().optional(),
  textModel: z.string().optional(),
  multimodalModel: z.string().optional()
});

const patchSchema = z
  .object({
    primary: providerPatchSchema.optional(),
    fallback: providerPatchSchema.optional()
  })
  .refine((value) => value.primary || value.fallback, {
    message: "At least one provider patch is required."
  });

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-ai-config"
    });
    if (authResult.error) return authResult.error;

    const overview = await getAiConfigOverview();
    return Response.json({
      config: {
        encryptionReady: overview.encryptionReady,
        primary: overview.primary,
        fallback: overview.fallback
      }
    });
  } catch (error) {
    return routeError("admin:ai-config:get", error);
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-ai-config-update"
    });
    if (authResult.error) return authResult.error;

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error);
    }

    if (
      ((parsed.data.primary?.apiKey && parsed.data.primary.apiKey.trim()) ||
        (parsed.data.fallback?.apiKey && parsed.data.fallback.apiKey.trim())) &&
      !hasAiEncryptionSecret()
    ) {
      return Response.json({ error: "AI_PROVIDER_ENCRYPTION_KEY is missing, so provider keys cannot be stored safely." }, { status: 400 });
    }

    const before = await getAiConfigOverview();
    const changes: string[] = [];

    if (parsed.data.primary) {
      const result = await upsertAiProviderConfig("primary", parsed.data.primary, authResult.userId);
      changes.push(`Primary provider ${result.validation.status}`);
    }

    if (parsed.data.fallback) {
      const result = await upsertAiProviderConfig("fallback", parsed.data.fallback, authResult.userId);
      changes.push(`Fallback provider ${result.validation.status}`);
    }

    const after = await getAiConfigOverview();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "ai.config.update",
      targetModel: "AiProviderConfig",
      summary: changes.join(" • "),
      before,
      after
    });

    return Response.json({
      ok: true,
      config: {
        encryptionReady: after.encryptionReady,
        primary: after.primary,
        fallback: after.fallback
      }
    });
  } catch (error) {
    return routeError("admin:ai-config:update", error);
  }
}
