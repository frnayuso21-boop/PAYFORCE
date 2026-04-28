import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/audit-log?limit=50&offset=0
 * Devuelve el log de auditoría del usuario autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "50",  10) || 50,  100);
    const offset = parseInt(searchParams.get("offset") ?? "0",  10) || 0;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: "desc" },
        take:    limit,
        skip:    offset,
        select: {
          id:         true,
          action:     true,
          resource:   true,
          resourceId: true,
          ipAddress:  true,
          userAgent:  true,
          metadata:   true,
          createdAt:  true,
        },
      }),
      db.auditLog.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ logs, total }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[audit-log]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
