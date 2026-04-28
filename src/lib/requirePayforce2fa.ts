/**
 * En layouts server: redirige a /login/2fa si el usuario tiene 2FA PayForce
 * y no presenta cookie de sesión TOTP válida.
 */
import { redirect }        from "next/navigation";
import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db }              from "@/lib/db";
import { verifyPayforce2faCookie, COOKIE_NAME } from "@/lib/twoFactorCookie";

export async function ensurePayforce2faSatisfied(): Promise<void> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true"
  ) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: sb },
  } = await supabase.auth.getUser();
  if (!sb?.id) return;

  const u = await db.user.findUnique({
    where:  { supabaseId: sb.id },
    select: { id: true, twoFactorEnabled: true },
  });
  if (!u?.twoFactorEnabled) return;

  const jar  = await cookies();
  const raw  = jar.get(COOKIE_NAME)?.value;
  const ok   = verifyPayforce2faCookie(raw, u.id);
  if (ok) return;

  const h = await headers();
  const from = h.get("x-payforce-pathname") ?? "/app/dashboard";
  redirect(`/login/2fa?from=${encodeURIComponent(from)}`);
}
