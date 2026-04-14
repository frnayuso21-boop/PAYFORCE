import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

/**
 * POST /api/connect/setup
 *
 * Actualiza datos locales del merchant (businessName) sin tocar el estado Connect.
 * El status/chargesEnabled SOLO los actualiza Stripe vía webhook account.updated.
 * Ya no acepta IBAN ni activa la cuenta — eso lo hace Stripe Express onboarding.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    let body: { businessName?: string } = {};
    try { body = await req.json(); } catch { /* sin body */ }

    const { businessName } = body;

    const existing = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: "No se encontró la cuenta." }, { status: 404 });
    }

    await db.connectedAccount.update({
      where: { id: existing.id },
      data: {
        ...(businessName?.trim() ? { businessName: businessName.trim() } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
