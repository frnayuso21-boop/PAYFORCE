import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";
import { audit, getIp }             from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS     = 3;
const LOCKOUT_MINUTES  = 15;

/**
 * POST /api/auth/2fa/attempt
 * Registra un intento fallido de 2FA.
 * Bloquea la cuenta después de MAX_ATTEMPTS intentos.
 *
 * Body: { failed: boolean }
 * Returns: { locked: boolean; lockedUntil?: string; attemptsLeft?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { user }    = await requireAuth(req);
    const { failed }  = await req.json() as { failed: boolean };
    const ip          = getIp(req);

    const dbUser = await db.user.findUnique({
      where:  { id: user.id },
      select: { loginAttempts: true, lockedUntil: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Resetear si el intento fue exitoso
    if (!failed) {
      await db.user.update({
        where: { id: user.id },
        data:  { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
      });
      await audit({
        userId:    user.id,
        action:    "2FA_SUCCESS",
        resource:  "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
      return NextResponse.json({ locked: false });
    }

    // Incrementar intentos fallidos
    const newAttempts = (dbUser.loginAttempts ?? 0) + 1;
    const shouldLock  = newAttempts >= MAX_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
      : null;

    await db.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: shouldLock ? 0 : newAttempts,
        ...(lockedUntil ? { lockedUntil } : {}),
      },
    });

    await audit({
      userId:    user.id,
      action:    "2FA_FAILED",
      resource:  "user",
      resourceId: user.id,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata:  { attempt: newAttempts, locked: shouldLock },
    });

    return NextResponse.json({
      locked:       shouldLock,
      lockedUntil:  lockedUntil?.toISOString(),
      attemptsLeft: shouldLock ? 0 : MAX_ATTEMPTS - newAttempts,
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/attempt]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * GET /api/auth/2fa/attempt
 * Comprueba si el usuario está bloqueado.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const dbUser = await db.user.findUnique({
      where:  { id: user.id },
      select: { lockedUntil: true, loginAttempts: true },
    });
    if (!dbUser) return NextResponse.json({ locked: false });

    const now    = new Date();
    const locked = dbUser.lockedUntil !== null && dbUser.lockedUntil > now;

    if (locked) {
      return NextResponse.json({
        locked:      true,
        lockedUntil: dbUser.lockedUntil?.toISOString(),
      });
    }

    // Limpiar bloqueo expirado
    if (dbUser.lockedUntil && dbUser.lockedUntil <= now) {
      await db.user.update({
        where: { id: user.id },
        data:  { lockedUntil: null, loginAttempts: 0 },
      });
    }

    return NextResponse.json({
      locked:       false,
      attemptsLeft: MAX_ATTEMPTS - (dbUser.loginAttempts ?? 0),
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ locked: false });
  }
}
