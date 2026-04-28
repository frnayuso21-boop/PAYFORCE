import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/dashboard/payouts/add-debit-card
// Recibe un token de Stripe.js y lo vincula como external account de tipo tarjeta.
// NUNCA recibe datos raw de tarjeta — siempre tokenizados con Stripe.js en el frontend.
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const { tokenId } = await req.json() as { tokenId: string };

    if (!tokenId || !tokenId.startsWith("tok_")) {
      return NextResponse.json({ error: "Token de tarjeta inválido" }, { status: 400 });
    }

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Añadir la tarjeta como external account en Stripe
    const externalAccount = await stripe.accounts.createExternalAccount(
      account.stripeAccountId,
      { external_account: tokenId },
    );

    // Verificar que es tarjeta de débito
    const card = externalAccount as {
      id: string; object: string; funding?: string;
      brand: string; last4: string; exp_month: number; exp_year: number;
    };

    if (card.funding !== "debit") {
      // Eliminar la tarjeta recién añadida (no es débito)
      await stripe.accounts.deleteExternalAccount(account.stripeAccountId, card.id).catch(() => null);
      return NextResponse.json(
        { error: "Solo se aceptan tarjetas de débito para instant payouts. Las tarjetas de crédito no son válidas." },
        { status: 400 },
      );
    }

    // Guardar en BD: activar instant payouts y guardar datos de la tarjeta
    await db.connectedAccount.update({
      where: { id: account.id },
      data:  {
        instantPayoutsEnabled: true,
        debitCardLast4:        card.last4,
        debitCardBrand:        card.brand,
      },
    });

    return NextResponse.json({
      success: true,
      card: {
        id:       card.id,
        brand:    card.brand,
        last4:    card.last4,
        expMonth: card.exp_month,
        expYear:  card.exp_year,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[add-debit-card]", err);
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
