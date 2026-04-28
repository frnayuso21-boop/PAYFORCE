/**
 * Rate limiting para intentos de login (IP) vía Upstash Redis.
 * Sin variables de entorno, devuelve siempre { success: true }.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis }     from "@upstash/redis";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX       = 5;

function getLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter:    Ratelimit.slidingWindow(LOGIN_MAX, `${LOGIN_WINDOW_MS / 1000} s`),
    prefix:     "payforce:login",
    analytics:  false,
  });
}

const limiter = typeof window === "undefined" ? getLimiter() : null;

export async function rateLimitLogin(identifier: string): Promise<{
  success: boolean;
  remaining?: number;
  reset?: number;
}> {
  if (!limiter) return { success: true };
  const r = await limiter.limit(identifier);
  return {
    success:   r.success,
    remaining: r.remaining,
    reset:     r.reset,
  };
}
