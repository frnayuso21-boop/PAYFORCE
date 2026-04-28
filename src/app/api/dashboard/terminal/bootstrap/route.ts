/**
 * GET /api/dashboard/terminal/bootstrap
 * Devuelve el stripeAccountId del merchant para inicializar Stripe.js (Elements en cuenta conectada).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const account = await getUserPrimaryAccount(session.user.id);

    if (!account?.stripeAccountId || account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json({
        ready:            false,
        stripeAccountId: null,
        message:          "Conecta y activa tu cuenta Stripe para usar el terminal.",
      });
    }

    return NextResponse.json({
      ready:            true,
      stripeAccountId:  account.stripeAccountId,
      chargesEnabled:   account.chargesEnabled,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[terminal bootstrap]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
