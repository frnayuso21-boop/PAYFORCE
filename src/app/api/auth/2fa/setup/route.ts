import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode            from "qrcode";
import { requireAuth, AuthError } from "@/lib/auth";
import { db }            from "@/lib/db";
import { encryptTotpSecret } from "@/lib/twoFactorCrypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/setup
 * Genera secreto TOTP, lo guarda cifrado como pendiente (no activa 2FA).
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const dbUser = await db.user.findUnique({
      where:  { id: user.id },
      select: { twoFactorEnabled: true },
    });
    if (dbUser?.twoFactorEnabled) {
      return NextResponse.json({ error: "El 2FA ya está activado" }, { status: 400 });
    }

    const secret = generateSecret();
    let enc: string;
    try {
      enc = encryptTotpSecret(secret);
    } catch {
      return NextResponse.json(
        { error: "Configuración de cifrado incompleta en el servidor" },
        { status: 503 },
      );
    }

    await db.user.update({
      where: { id: user.id },
      data:  { twoFactorPendingSecret: enc, twoFactorSecret: null },
    });

    const otpauth = generateURI({ issuer: "PayForce", label: user.email, secret });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    return NextResponse.json({ secret, qrCodeUrl });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/setup]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
