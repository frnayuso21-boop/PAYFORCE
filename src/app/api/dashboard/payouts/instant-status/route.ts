import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/dashboard/payouts/instant-status
// Devuelve si el merchant tiene instant payouts activos y las tarjetas de débito vinculadas.
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) {
      return NextResponse.json({ instantAvailable: false, cards: [] });
    }

    const isLocal = account.stripeAccountId.startsWith("local_");
    if (isLocal) {
      return NextResponse.json({
        instantAvailable: account.instantPayoutsEnabled,
        cards: account.debitCardLast4
          ? [{ id: "local", brand: account.debitCardBrand ?? "Visa", last4: account.debitCardLast4, expMonth: 12, expYear: 27 }]
          : [],
      });
    }

    // Obtener external accounts de tipo tarjeta del merchant en Stripe
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      account.stripeAccountId,
      { object: "card" },
    );

    const debitCards = externalAccounts.data.filter(
      (ea) => ea.object === "card" && (ea as { funding?: string }).funding === "debit",
    );

    const cards = debitCards.map((c) => {
      const card = c as {
        id: string; brand: string; last4: string;
        exp_month: number; exp_year: number;
      };
      return { id: card.id, brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year };
    });

    return NextResponse.json({
      instantAvailable: cards.length > 0,
      cards,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[instant-status]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
