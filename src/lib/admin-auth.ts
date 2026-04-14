/**
 * src/lib/admin-auth.ts
 *
 * Helper para proteger endpoints y páginas del panel admin.
 * Verifica que el usuario tiene role === "ADMIN" en la DB.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }    from "@/lib/auth";
import { db }                        from "@/lib/db";

export class AdminError extends Error {
  status: number;
  constructor(message = "Acceso denegado", status = 403) {
    super(message);
    this.name   = "AdminError";
    this.status = status;
  }
}

export async function requireAdmin(req: NextRequest) {
  const session = await requireAuth(req);
  const user    = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") {
    throw new AdminError("Solo administradores pueden acceder a este recurso");
  }
  return session;
}

export function withAdmin(
  handler: (req: NextRequest, session: Awaited<ReturnType<typeof requireAdmin>>) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await requireAdmin(req);
      return await handler(req, session);
    } catch (err) {
      if (err instanceof AdminError || err instanceof AuthError) {
        return NextResponse.json({ error: (err as Error).message }, { status: (err as AdminError).status });
      }
      console.error("[withAdmin]", err);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  };
}
