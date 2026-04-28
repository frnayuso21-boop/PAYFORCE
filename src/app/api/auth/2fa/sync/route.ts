import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";
import { audit, getIp }             from "@/lib/audit";
import { logAuthSecurityAudit }     from "@/lib/supabaseSecurityAudit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/sync
 * Sincroniza el estado de 2FA en nuestra BD tras activar/desactivar en Supabase.
 * Body: { enabled: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const session         = await requireAuth(req);
    const { user }        = session;
    const { enabled }     = await req.json() as { enabled: boolean };

    await db.user.update({
      where: { id: user.id },
      data:  { twoFactorEnabled: enabled },
    });

    await audit({
      userId:    user.id,
      action:    enabled ? "2FA_ENABLED" : "2FA_DISABLED",
      resource:  "user",
      resourceId: user.id,
      ipAddress: getIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    await logAuthSecurityAudit(req, session, {
      action:   enabled ? "2FA_ENABLED" : "2FA_DISABLED",
      resource: "user",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/sync]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
