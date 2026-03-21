import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit, type RateLimitPolicy } from "@/lib/ratelimit";
import { connectToDatabase } from "@/lib/mongodb";
import { captureServerRouteError } from "@/lib/error-logging";
import { UserModel } from "@/models/User";

export async function requireUser(options?: { allowSuspended?: boolean }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).select("name email image role status").lean();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!options?.allowSuspended && user.status === "suspended") {
    return { error: NextResponse.json({ error: "Account suspended" }, { status: 403 }) };
  }

  return { userId: session.user.id, session, user };
}

export async function requireAdmin() {
  const authResult = await requireUser();
  if (authResult.error) {
    return authResult;
  }

  if (authResult.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return authResult;
}

export async function applyRouteRateLimit(identifier: string, policy: RateLimitPolicy = "default") {
  const result = await enforceRateLimit(identifier, policy);
  if (!result.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  return null;
}

export function parseJsonString(input: string) {
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first === -1 || last === -1) {
    throw new Error("JSON object not found in model response");
  }
  return JSON.parse(input.slice(first, last + 1));
}

export function parseJsonArray(input: string) {
  const first = input.indexOf("[");
  const last = input.lastIndexOf("]");
  if (first === -1 || last === -1) {
    throw new Error("JSON array not found in model response");
  }
  return JSON.parse(input.slice(first, last + 1));
}

export function buildUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function buildForbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function routeError(routeName: string, error: unknown, status = 500) {
  console.error(`[${routeName}]`, error);
  await captureServerRouteError(routeName, error, status);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status });
}
