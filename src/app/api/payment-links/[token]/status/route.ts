import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/payment-links/[token]/status
// Devuelve el estado actual de un payment link (para polling en checkout)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { user }  = await requireAuth(req);
    const { token } = await params;

    const link = await db.paymentLink.findUnique({
      where:  { token },
      select: { id: true, status: true, amount: true, currency: true, createdById: true },
    });

    if (!link) {
      return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });
    }

    if (link.createdById !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({ id: link.id, status: link.status, amount: link.amount, currency: link.currency });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[payment-links status GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
