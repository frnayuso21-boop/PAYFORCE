import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertAuthSecurityAudit } from "@/lib/supabaseSecurityAudit";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["LOGIN_SUCCESS", "MFA_SUCCESS"]);

/**
 * POST /api/auth/session-audit
 * Registra eventos con sesión Supabase activa (p. ej. login sin MFA o tras MFA).
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { event?: string };
  const event = body.event ?? "";
  if (!ALLOWED.has(event)) {
    return NextResponse.json({ error: "Evento no válido" }, { status: 400 });
  }

  await insertAuthSecurityAudit({
    supabaseUserId: user.id,
    action:         event,
    resource:       "auth",
    ipAddress:      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                    ?? req.headers.get("x-real-ip")
                    ?? null,
    userAgent:      req.headers.get("user-agent"),
    metadata:       null,
  });

  return NextResponse.json({ ok: true });
}
