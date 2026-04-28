import { NextResponse }               from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LEGACY_TOTP_COOKIE = "pf_totp_ok";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LEGACY_TOTP_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   0,
  });
  return res;
}
