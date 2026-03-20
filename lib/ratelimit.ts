import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

const ratelimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "studyos"
  });

export async function enforceRateLimit(identifier: string) {
  if (!ratelimiter) {
    return { success: true, limit: 9999, remaining: 9999, reset: Date.now() + 60_000 };
  }
  return ratelimiter.limit(identifier);
}
