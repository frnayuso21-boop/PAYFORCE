import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard
 *
 * Stripe Connect Express + Destination Charges.
 * Balances y payouts se consultan en la cuenta Express del merchant
 * usando el header Stripe-Account (stripeAccount option en el SDK).
 * Los datos de BD (payments, disputes) ya están correctamente asociados
 * por connectedAccountId.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const connectedAccount = await db.connectedAccount.findFirst({
      where:   { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    const connect = connectedAccount ? {
      stripeAccountId:  connectedAccount.stripeAccountId,
      businessName:     connectedAccount.businessName,
      email:            connectedAccount.email,
      country:          connectedAccount.country,
      defaultCurrency:  connectedAccount.defaultCurrency,
      chargesEnabled:   connectedAccount.chargesEnabled,
      payoutsEnabled:   connectedAccount.payoutsEnabled,
      detailsSubmitted: connectedAccount.detailsSubmitted,
      status:           connectedAccount.status,
    } : null;

    // Sin cuenta real → devolver datos vacíos con estado NOT_CONNECTED
    const hasRealAccount =
      connectedAccount?.stripeAccountId &&
      !connectedAccount.stripeAccountId.startsWith("local_");

    if (!hasRealAccount || !connectedAccount) {
      return NextResponse.json({
        balance:        { available: { amount: 0, currency: "eur" }, pending: { amount: 0, currency: "eur" } },
        recentPayments: [],
        payouts:        [],
        disputes:       [],
        connect,
      });
    }

    const currency     = connectedAccount.defaultCurrency ?? "eur";
    const stripeOpts   = { stripeAccount: connectedAccount.stripeAccountId };

    // Consultar Stripe y BD en paralelo
    const [balance, recentPayouts, recentPayments, disputes] = await Promise.all([
      // Balance real del merchant en su cuenta Express
      stripe.balance.retrieve({}, stripeOpts).catch(() => null),

      // Últimos payouts del merchant
      stripe.payouts.list({ limit: 5 }, stripeOpts)
        .then((r) => r.data)
        .catch(() => [] as import("stripe").default.Payout[]),

      // Pagos recientes de BD
      db.payment.findMany({
        where:   { connectedAccountId: connectedAccount.id, status: "SUCCEEDED" },
        orderBy: { capturedAt: "desc" },
        take:    10,
        select: {
          id: true, amount: true, currency: true, description: true,
          applicationFeeAmount: true, netAmount: true, capturedAt: true,
        },
      }),

      // Disputas activas de BD
      db.dispute.findMany({
        where: {
          connectedAccountId: connectedAccount.id,
          status: { in: ["NEEDS_RESPONSE", "UNDER_REVIEW", "WARNING_NEEDS_RESPONSE"] },
        },
        orderBy: { createdAt: "desc" },
        take:    5,
        select: { id: true, amount: true, currency: true, status: true, reason: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      balance: {
        available: {
          amount:   balance?.available.find((b) => b.currency === currency)?.amount ?? 0,
          currency,
        },
        pending: {
          amount:   balance?.pending.find((b) => b.currency === currency)?.amount ?? 0,
          currency,
        },
      },
      recentPayments,
      payouts: recentPayouts.map((p) => ({
        id:          p.id,
        amount:      p.amount,
        currency:    p.currency,
        status:      p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        method:      p.method,
      })),
      disputes,
      connect,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dashboard]", err);
    return NextResponse.json({ error: "Error al obtener datos del dashboard" }, { status: 500 });
  }
}
