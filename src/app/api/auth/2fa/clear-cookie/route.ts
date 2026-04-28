import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { COOKIE_NAME }  from "@/lib/twoFactorCookie";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/clear-cookie
 * Tras login con contraseña, invalida la cookie TOTP para forzar el segundo paso.
 */
export async function POST() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   0,
  });
  return NextResponse.json({ ok: true });
}
