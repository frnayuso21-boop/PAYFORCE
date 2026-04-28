import { NextRequest, NextResponse } from "next/server";
import { rateLimitLogin } from "@/lib/loginRateLimit";
import { getIp }          from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/pre-login
 * Rate limit por IP antes de signInWithPassword (Supabase en cliente).
 * Body: { email?: string }
 */
export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const body = await req.json().catch(() => ({})) as { email?: string };
  const id = `${ip}:${(body.email ?? "").toLowerCase().trim()}`;

  const r = await rateLimitLogin(id);
  if (!r.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }
  return NextResponse.json({ ok: true });
}
