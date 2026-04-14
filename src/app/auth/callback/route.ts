/**
 * src/app/auth/callback/route.ts
 *
 * Handler del redirect de Supabase tras confirmar OTP o magic link.
 * Supabase redirige aquí con un `code` (flujo PKCE) que se intercambia
 * por una sesión real y se guarda en cookies.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Si falla el intercambio, mandar a login con error
  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
