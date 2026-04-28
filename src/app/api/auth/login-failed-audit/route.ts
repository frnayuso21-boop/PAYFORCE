import { NextRequest, NextResponse } from "next/server";
import { rateLimitLogin } from "@/lib/loginRateLimit";
import { getIp } from "@/lib/audit";
import { insertAuthSecurityAudit } from "@/lib/supabaseSecurityAudit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login-failed-audit
 * Login fallido sin sesión — rate limit por IP+email.
 */
export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = (body.email ?? "").toLowerCase().trim();

  const rl = await rateLimitLogin(`${ip}:${email || "unknown"}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Demasiados intentos." },
      { status: 429 },
    );
  }

  await insertAuthSecurityAudit({
    supabaseUserId: null,
    action:         "LOGIN_FAILED",
    resource:       "auth",
    ipAddress:      ip,
    userAgent:      req.headers.get("user-agent"),
    metadata:       email ? { emailHint: email.slice(0, 3) + "…" } : null,
  });

  return NextResponse.json({ ok: true });
}
