import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/supabase-security-audit?limit=50&offset=0
 * Lista eventos de auth_security_audit del usuario autenticado (RLS).
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  const { data: rows, error, count } = await supabase
    .from("auth_security_audit")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[supabase-security-audit]", error.message);
    return NextResponse.json({ error: "No se pudo cargar el registro" }, { status: 500 });
  }

  return NextResponse.json(
    { logs: rows ?? [], total: count ?? 0 },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
  );
}
