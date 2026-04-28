/**
 * Cookie firmada httpOnly para sesión post-TOTP (PayForce 2FA).
 */
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "pf_totp_ok";

function getSecret(): string {
  const s = process.env.PAYFORCE_2FA_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error("PAYFORCE_2FA_COOKIE_SECRET debe tener al menos 16 caracteres");
  }
  return s;
}

export function signPayforce2faCookie(userId: string, ttlMs: number): string {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}:${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}:${sig}`;
}

export function verifyPayforce2faCookie(token: string | undefined, userId: string): boolean {
  if (!token) return false;
  try {
    const lastColon = token.lastIndexOf(":");
    if (lastColon <= 0) return false;
    const payload = token.slice(0, lastColon);
    const sig     = token.slice(lastColon + 1);
    const expColon = payload.lastIndexOf(":");
    if (expColon <= 0) return false;
    const uid = payload.slice(0, expColon);
    const exp = Number(payload.slice(expColon + 1));
    if (uid !== userId || !Number.isFinite(exp) || exp < Date.now()) return false;
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
