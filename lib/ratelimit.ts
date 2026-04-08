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
  search: () => Ratelimit.slidingWindow(60, "1 m"),
  autopsy: () => Ratelimit.slidingWindow(10, "1 h"),
  focusComplete: () => Ratelimit.slidingWindow(30, "1 h"),
  scanner: () => Ratelimit.slidingWindow(20, "1 d"),
  scannerConvert: () => Ratelimit.slidingWindow(20, "1 d"),
  teachMe: () => Ratelimit.slidingWindow(30, "1 d"),
  evaluator: () => Ratelimit.slidingWindow(15, "1 d"),
  simplify: () => Ratelimit.slidingWindow(50, "1 d"),
  pastPaper: () => Ratelimit.slidingWindow(5, "1 d"),
  studyRoom: () => Ratelimit.slidingWindow(120, "1 h"),
  studyRoomJoin: () => Ratelimit.slidingWindow(40, "1 h"),
  studyRoomMessage: () => Ratelimit.slidingWindow(240, "1 h"),
  studyRoomSync: () => Ratelimit.slidingWindow(1800, "1 h"),
  studyRoomWhiteboardSegment: () => Ratelimit.slidingWindow(900, "1 m"),
  studyRoomWhiteboardFinal: () => Ratelimit.slidingWindow(2400, "1 h"),
  realtimeAuth: () => Ratelimit.slidingWindow(180, "1 h"),
  achievements: () => Ratelimit.slidingWindow(60, "1 h"),
  graph: () => Ratelimit.slidingWindow(40, "1 h"),
  formula: () => Ratelimit.slidingWindow(60, "1 h"),
  formulaQuiz: () => Ratelimit.slidingWindow(20, "1 h"),
  formulaMutation: () => Ratelimit.slidingWindow(60, "1 h"),
  feedback: () => Ratelimit.slidingWindow(10, "1 h"),
  clientError: () => Ratelimit.slidingWindow(60, "1 h"),
  revisionMutation: () => Ratelimit.slidingWindow(80, "1 h"),
  examMutation: () => Ratelimit.slidingWindow(40, "1 h"),
  examPanic: () => Ratelimit.slidingWindow(8, "1 h"),
  adminRead: () => Ratelimit.slidingWindow(120, "1 m"),
  adminWrite: () => Ratelimit.slidingWindow(30, "1 m")
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
