import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/2fa/status
 * Estado MFA según factores Supabase (TOTP verificado).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const supabase = await createSupabaseServerClient();
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const verified = factors?.totp?.filter((f) => f.status === "verified") ?? [];
    const enabled = verified.length > 0;

    return NextResponse.json({
      mfaEnabled: enabled,
      twoFactorEnabled: enabled,
      factors: verified.map((f) => ({
        id:        f.id,
        type:      f.factor_type,
        createdAt: f.created_at,
      })),
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
