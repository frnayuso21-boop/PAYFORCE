import { NextRequest, NextResponse } from "next/server";
import { cookies }     from "next/headers";
import { verifySync } from "otplib";
import { requireAuth, AuthError } from "@/lib/auth";
import { db }            from "@/lib/db";
import { audit, getIp } from "@/lib/audit";
import { encryptTotpSecret, decryptTotpSecret } from "@/lib/twoFactorCrypto";
import { generateBackupCodesPlain, hashBackupCodes } from "@/lib/twoFactorBackupCodes";
import { signPayforce2faCookie, COOKIE_NAME } from "@/lib/twoFactorCookie";

const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/verify
 * Verifica el primer código TOTP y activa 2FA + códigos de respaldo.
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { code } = await req.json() as { code?: string };
    const token    = (code ?? "").replace(/\s/g, "");
    if (token.length !== 6) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where:  { id: user.id },
      select: {
        twoFactorEnabled:       true,
        twoFactorPendingSecret: true,
      },
    });
    if (!dbUser?.twoFactorPendingSecret) {
      return NextResponse.json({ error: "No hay configuración pendiente. Inicia de nuevo." }, { status: 400 });
    }
    if (dbUser.twoFactorEnabled) {
      return NextResponse.json({ error: "El 2FA ya está activado" }, { status: 400 });
    }

    let secret: string;
    try {
      secret = decryptTotpSecret(dbUser.twoFactorPendingSecret);
    } catch {
      return NextResponse.json({ error: "Error al leer el secreto" }, { status: 500 });
    }

    const valid = verifySync({ secret, token, epochTolerance: 1 }).valid;
    if (!valid) {
      await audit({
        userId:     user.id,
        action:     "2FA_FAILED",
        resource:   "user",
        resourceId: user.id,
        ipAddress:  getIp(req),
        userAgent:  req.headers.get("user-agent") ?? undefined,
        metadata:   { phase: "enrollment" },
      });
      return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
    }

    const plainBackup = generateBackupCodesPlain(10);
    const hashed      = await hashBackupCodes(plainBackup);
    const encActive   = encryptTotpSecret(secret);

    await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret:        encActive,
        twoFactorPendingSecret: null,
        twoFactorEnabled:       true,
        twoFactorVerifiedAt:    new Date(),
        twoFactorBackupCodes:   JSON.stringify(hashed),
      },
    });

    await audit({
      userId:     user.id,
      action:     "2FA_ENABLED",
      resource:   "user",
      resourceId: user.id,
      ipAddress:  getIp(req),
      userAgent:  req.headers.get("user-agent") ?? undefined,
    });

    const cookieVal = signPayforce2faCookie(user.id, COOKIE_TTL_MS);
    const jar       = await cookies();
    jar.set(COOKIE_NAME, cookieVal, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   Math.floor(COOKIE_TTL_MS / 1000),
    });

    return NextResponse.json({ backupCodes: plainBackup });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/verify]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
