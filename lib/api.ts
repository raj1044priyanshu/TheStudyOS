import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit, type RateLimitPolicy } from "@/lib/ratelimit";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id, session };
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

export function routeError(routeName: string, error: unknown, status = 500) {
  console.error(`[${routeName}]`, error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status });
}
