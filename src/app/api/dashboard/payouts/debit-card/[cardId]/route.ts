import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE /api/dashboard/payouts/debit-card/[cardId]
// Elimina una tarjeta de débito como external account de Stripe y desactiva instant payouts.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const { user }   = await requireAuth(req);
    const { cardId } = await params;

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Eliminar de Stripe
    await stripe.accounts.deleteExternalAccount(account.stripeAccountId, cardId);

    // Comprobar si quedan más tarjetas de débito activas
    const remaining = await stripe.accounts.listExternalAccounts(
      account.stripeAccountId,
      { object: "card" },
    );
    const stillHasDebitCard = remaining.data.some(
      (ea) => ea.object === "card" && (ea as { funding?: string }).funding === "debit",
    );

    // Actualizar BD
    await db.connectedAccount.update({
      where: { id: account.id },
      data:  {
        instantPayoutsEnabled: stillHasDebitCard,
        debitCardLast4:        stillHasDebitCard ? account.debitCardLast4 : null,
        debitCardBrand:        stillHasDebitCard ? account.debitCardBrand : null,
      },
    });

    return NextResponse.json({ success: true, instantAvailable: stillHasDebitCard });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[delete-debit-card]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}
