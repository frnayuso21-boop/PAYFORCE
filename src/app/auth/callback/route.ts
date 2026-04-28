/**
 * src/app/auth/callback/route.ts
 *
 * Handler del redirect de Supabase tras confirmar OTP o magic link.
 * Supabase redirige aquí con un `code` (flujo PKCE) que se intercambia
 * por una sesión real y se guarda en cookies.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertAuthSecurityAudit } from "@/lib/supabaseSecurityAudit";

const LEGACY_TOTP_COOKIE = "pf_totp_ok";

function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? null
  );
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const mfaPending =
          aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2";
        if (!mfaPending) {
          await insertAuthSecurityAudit({
            supabaseUserId: u.id,
            action:         "LOGIN_SUCCESS",
            resource:       "auth",
            ipAddress:      clientIp(req),
            userAgent:      req.headers.get("user-agent"),
            metadata:       { via: "oauth" },
          });
        }
      }

      const res = NextResponse.redirect(new URL(next, origin));
      res.cookies.set(LEGACY_TOTP_COOKIE, "", {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:     "/",
        maxAge:   0,
      });
      return res;
    }
  }

  // Si falla el intercambio, mandar a login con error
  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
