import { NextRequest, NextResponse } from "next/server";
import { cookies }     from "next/headers";
import { requireAuth, AuthError } from "@/lib/auth";
import { db }          from "@/lib/db";
import { audit, getIp } from "@/lib/audit";
import { COOKIE_NAME } from "@/lib/twoFactorCookie";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/disable
 * Desactiva 2FA PayForce y borra secretos / códigos de respaldo.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled:       false,
        twoFactorSecret:        null,
        twoFactorPendingSecret: null,
        twoFactorVerifiedAt:    null,
        twoFactorBackupCodes:   null,
      },
    });

    const jar = await cookies();
    jar.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   0,
    });

    await audit({
      userId:     user.id,
      action:     "2FA_DISABLED",
      resource:   "user",
      resourceId: user.id,
      ipAddress:  getIp(req),
      userAgent:  req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/disable]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
