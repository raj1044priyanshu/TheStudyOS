import crypto from "node:crypto";
import { getAppSettings } from "@/lib/app-settings";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { sendAdminErrorAlertEmail } from "@/lib/email";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { UserModel } from "@/models/User";

export type AppErrorSource = "server" | "client" | "render" | "unhandled_rejection";
export type AppErrorSeverity = "info" | "warning" | "error" | "fatal";
export type AppErrorStatus = "open" | "acknowledged" | "resolved" | "ignored";

interface CaptureAppErrorInput {
  source: AppErrorSource;
  severity?: AppErrorSeverity;
  status?: AppErrorStatus;
  error?: unknown;
  message?: string;
  stack?: string;
  digest?: string;
  route?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  userId?: string | null;
  userEmail?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

const ERROR_SEVERITY_ORDER: AppErrorSeverity[] = ["info", "warning", "error", "fatal"];

function normalizeError(input: CaptureAppErrorInput) {
  const fromError =
    input.error && typeof input.error === "object"
      ? (input.error as { message?: string; stack?: string; digest?: string })
      : null;

  return {
    message: input.message ?? fromError?.message ?? "Unknown application error",
    stack: input.stack ?? fromError?.stack ?? "",
    digest: input.digest ?? fromError?.digest ?? "",
    severity: input.severity ?? (input.source === "render" ? "fatal" : "error"),
    statusCode: input.statusCode ?? 500
  };
}

export function createErrorFingerprint(input: CaptureAppErrorInput) {
  const normalized = normalizeError(input);

  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        source: input.source,
        route: input.route ?? "",
        url: input.url ?? "",
        method: input.method ?? "",
        message: normalized.message,
        digest: normalized.digest,
        stackTop: normalized.stack.split("\n")[0] ?? "",
        statusCode: normalized.statusCode
      })
    )
    .digest("hex");
}

function shouldNotifySeverity(threshold: AppErrorSeverity, severity: AppErrorSeverity) {
  return ERROR_SEVERITY_ORDER.indexOf(severity) >= ERROR_SEVERITY_ORDER.indexOf(threshold);
}

export async function captureAppError(input: CaptureAppErrorInput) {
  const normalized = normalizeError(input);
  const fingerprint = createErrorFingerprint(input);
  const occurredAt = input.occurredAt ?? new Date();

  await connectToDatabase();

  const event = {
    seenAt: occurredAt,
    message: normalized.message,
    stack: normalized.stack,
    digest: normalized.digest,
    route: input.route ?? "",
    url: input.url ?? "",
    method: input.method ?? "",
    statusCode: normalized.statusCode,
    userId: input.userId ?? null,
    userEmail: input.userEmail ?? "",
    sessionId: input.sessionId ?? "",
    requestId: input.requestId ?? "",
    userAgent: input.userAgent ?? "",
    metadata: input.metadata ?? {}
  };

  let log = await AppErrorLogModel.findOne({ fingerprint });

  if (!log) {
    log = await AppErrorLogModel.create({
      fingerprint,
      source: input.source,
      severity: normalized.severity,
      message: normalized.message,
      stack: normalized.stack,
      digest: normalized.digest,
      route: input.route ?? "",
      url: input.url ?? "",
      method: input.method ?? "",
      status: input.status ?? "open",
      statusCode: normalized.statusCode,
      occurrences: 1,
      firstSeenAt: occurredAt,
      lastSeenAt: occurredAt,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? "",
      sessionId: input.sessionId ?? "",
      requestId: input.requestId ?? "",
      userAgent: input.userAgent ?? "",
      metadata: input.metadata ?? {},
      affectedUserIds: input.userId ? [input.userId] : [],
      events: [event]
    });
  } else {
    log.severity = normalized.severity;
    log.message = normalized.message;
    log.stack = normalized.stack || log.stack;
    log.digest = normalized.digest || log.digest;
    log.route = input.route ?? log.route;
    log.url = input.url ?? log.url;
    log.method = input.method ?? log.method;
    log.statusCode = normalized.statusCode;
    log.lastSeenAt = occurredAt;
    log.occurrences += 1;
    log.userId = input.userId ?? log.userId;
    log.userEmail = input.userEmail ?? log.userEmail;
    log.sessionId = input.sessionId ?? log.sessionId;
    log.requestId = input.requestId ?? log.requestId;
    log.userAgent = input.userAgent ?? log.userAgent;
    log.metadata = { ...(toSerializable(log.metadata ?? {}) as Record<string, unknown>), ...(input.metadata ?? {}) };
    log.affectedUserIds = Array.from(new Set([...(log.affectedUserIds ?? []), ...(input.userId ? [input.userId] : [])]));
    log.events = [...(log.events ?? []), event].slice(-25);
    await log.save();
  }

  try {
    const settings = await getAppSettings();
    const shouldNotify =
      settings.featureToggles.errorMonitoring &&
      shouldNotifySeverity(settings.errorAlerts.severityThreshold, normalized.severity) &&
      log.status !== "resolved" &&
      log.status !== "ignored" &&
      (!log.lastNotifiedAt ||
        occurredAt.getTime() - new Date(log.lastNotifiedAt).getTime() >
          settings.errorAlerts.cooldownMinutes * 60_000);

    if (shouldNotify) {
      const admins = await UserModel.find({ role: "admin", status: "active" }).select("email name").lean();
      const recipients = admins
        .map((admin) => admin.email?.trim())
        .filter((email): email is string => Boolean(email));

      if (recipients.length) {
        await Promise.all(
          recipients.map((email) =>
            sendAdminErrorAlertEmail(email, {
              severity: normalized.severity,
              source: input.source,
              message: normalized.message,
              route: input.route ?? "",
              url: input.url ?? "",
              fingerprint,
              occurrences: log.occurrences,
              statusCode: normalized.statusCode
            })
          )
        );

        log.lastNotifiedAt = occurredAt;
        await log.save();
      }
    }
  } catch (error) {
    console.error("Failed to send admin error alert", error);
  }

  return log;
}

export async function captureServerRouteError(routeName: string, error: unknown, status = 500) {
  return captureAppError({
    source: "server",
    severity: status >= 500 ? "error" : "warning",
    error,
    route: routeName,
    statusCode: status,
    metadata: {
      routeName
    }
  });
}
