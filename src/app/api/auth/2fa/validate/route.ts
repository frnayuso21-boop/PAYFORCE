import { NextRequest, NextResponse } from "next/server";
import { cookies }     from "next/headers";
import { verifySync } from "otplib";
import { requireAuth, AuthError } from "@/lib/auth";
import { db }          from "@/lib/db";
import { audit, getIp } from "@/lib/audit";
import { decryptTotpSecret } from "@/lib/twoFactorCrypto";
import { verifyAndConsumeBackupCode } from "@/lib/twoFactorBackupCodes";
import { signPayforce2faCookie, COOKIE_NAME } from "@/lib/twoFactorCookie";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS    = 3;
const LOCKOUT_MINUTES = 15;
const COOKIE_TTL_MS   = 30 * 24 * 60 * 60 * 1000;

async function sendNewIpAlert(email: string, ip: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from:    process.env.RESEND_FROM ?? "PayForce <onboarding@resend.dev>",
      to:      email,
      subject: "Nuevo inicio de sesión en PayForce",
      html:    `<p>Se ha detectado un inicio de sesión desde una IP que no coincide con tus últimas sesiones.</p>
        <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
        <p>Si no has sido tú, cambia tu contraseña y revisa el 2FA.</p>`,
    });
  } catch {
    // no bloquear login
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseRecentIps(raw: string): string[] {
  try {
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * POST /api/auth/2fa/validate
 * Valida TOTP o código de respaldo tras login con contraseña.
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { code } = await req.json() as { code?: string };
    const input    = (code ?? "").trim();
    if (!input) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const ip = getIp(req);

    const dbUser = await db.user.findUnique({
      where:  { id: user.id },
      select: {
        email:              true,
        twoFactorEnabled:   true,
        twoFactorSecret:    true,
        twoFactorBackupCodes: true,
        lockedUntil:        true,
        loginAttempts:      true,
        recentLoginIps:     true,
      },
    });
    if (!dbUser?.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "2FA no activo" }, { status: 400 });
    }

    const now = new Date();
    if (dbUser.lockedUntil && dbUser.lockedUntil > now) {
      return NextResponse.json(
        { error: "Cuenta bloqueada temporalmente. Inténtalo más tarde.", lockedUntil: dbUser.lockedUntil.toISOString() },
        { status: 423 },
      );
    }
    if (dbUser.lockedUntil && dbUser.lockedUntil <= now) {
      await db.user.update({
        where: { id: user.id },
        data:  { lockedUntil: null, loginAttempts: 0 },
      });
    }

    let ok = false;
    let newBackupJson: string | undefined;

    const token6 = input.replace(/\s/g, "");
    if (token6.length === 6 && /^\d+$/.test(token6)) {
      try {
        const secret = decryptTotpSecret(dbUser.twoFactorSecret);
        ok = verifySync({ secret, token: token6, epochTolerance: 1 }).valid;
      } catch {
        ok = false;
      }
    }

    if (!ok) {
      const backup = await verifyAndConsumeBackupCode(input, dbUser.twoFactorBackupCodes);
      if (backup.ok && backup.remainingHashes) {
        ok = true;
        newBackupJson = JSON.stringify(backup.remainingHashes);
      }
    }

    if (!ok) {
      const newAttempts = (dbUser.loginAttempts ?? 0) + 1;
      const shouldLock    = newAttempts >= MAX_ATTEMPTS;
      const lockedUntil   = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;

      await db.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: shouldLock ? 0 : newAttempts,
          ...(lockedUntil ? { lockedUntil } : {}),
        },
      });

      await audit({
        userId:     user.id,
        action:     "2FA_FAILED",
        resource:   "user",
        resourceId: user.id,
        ipAddress:  ip,
        userAgent:  req.headers.get("user-agent") ?? undefined,
        metadata:   { attempts: newAttempts, locked: shouldLock },
      });

      return NextResponse.json({
        error:        "Código incorrecto",
        locked:       shouldLock,
        lockedUntil:  lockedUntil?.toISOString(),
        attemptsLeft: shouldLock ? 0 : MAX_ATTEMPTS - newAttempts,
      }, { status: 400 });
    }

    const recent = parseRecentIps(dbUser.recentLoginIps);
    const isNew  = ip !== "unknown" && !recent.slice(-3).includes(ip);
    const nextRecent = [...recent.filter((x) => x !== ip), ip].slice(-3);

    await db.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil:   null,
        lastLoginAt:   now,
        lastLoginIp:   ip,
        recentLoginIps: JSON.stringify(nextRecent),
        ...(newBackupJson !== undefined ? { twoFactorBackupCodes: newBackupJson } : {}),
      },
    });

    if (isNew) {
      void sendNewIpAlert(dbUser.email, ip);
    }

    await audit({
      userId:     user.id,
      action:     "2FA_SUCCESS",
      resource:   "user",
      resourceId: user.id,
      ipAddress:  ip,
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/validate]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
