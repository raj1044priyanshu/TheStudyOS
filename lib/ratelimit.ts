import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

const policies = {
  default: () => Ratelimit.slidingWindow(20, "1 m"),
  autopsy: () => Ratelimit.slidingWindow(10, "1 h"),
  focusComplete: () => Ratelimit.slidingWindow(30, "1 h"),
  scanner: () => Ratelimit.slidingWindow(20, "1 d"),
  teachMe: () => Ratelimit.slidingWindow(30, "1 d"),
  evaluator: () => Ratelimit.slidingWindow(15, "1 d"),
  simplify: () => Ratelimit.slidingWindow(50, "1 d"),
  pastPaper: () => Ratelimit.slidingWindow(5, "1 d"),
  studyRoom: () => Ratelimit.slidingWindow(120, "1 h"),
  achievements: () => Ratelimit.slidingWindow(60, "1 h"),
  graph: () => Ratelimit.slidingWindow(40, "1 h"),
  formula: () => Ratelimit.slidingWindow(60, "1 h")
} as const;

export type RateLimitPolicy = keyof typeof policies;

const limiters = new Map<RateLimitPolicy, Ratelimit>();

function getLimiter(policy: RateLimitPolicy) {
  if (!redis) {
    return null;
  }

  const cached = limiters.get(policy);
  if (cached) {
    return cached;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: policies[policy](),
    analytics: true,
    prefix: `studyos:${policy}`
  });
  limiters.set(policy, limiter);
  return limiter;
}

export async function enforceRateLimit(identifier: string, policy: RateLimitPolicy = "default") {
  const limiter = getLimiter(policy);
  if (!limiter) {
    return {
      success: true,
      limit: 9999,
      remaining: 9999,
      reset: Date.now() + 60_000,
      pending: 0
    };
  }
  return limiter.limit(identifier);
}
