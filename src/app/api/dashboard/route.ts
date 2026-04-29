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
        connect: connectedAccount ? {
          stripeAccountId:  connectedAccount.stripeAccountId,
          businessName:     connectedAccount.businessName,
          email:            connectedAccount.email,
          country:          connectedAccount.country,
          defaultCurrency:  connectedAccount.defaultCurrency,
          chargesEnabled:   connectedAccount.chargesEnabled,
          payoutsEnabled:   connectedAccount.payoutsEnabled,
          detailsSubmitted: connectedAccount.detailsSubmitted,
          status:           connectedAccount.status,
        } : null,
      });
    }

    const currency   = connectedAccount.defaultCurrency ?? "eur";
    const stripeOpts = { stripeAccount: connectedAccount.stripeAccountId };

    // Todas las llamadas Stripe + BD en un único Promise.all.
    // Antes accounts.retrieve era secuencial añadiendo 200-400ms al TTFB.
    const [stripeAcc, balance, recentPayouts, recentPayments, disputes] = await Promise.all([
      stripe.accounts.retrieve(connectedAccount.stripeAccountId).catch(() => null),

      stripe.balance.retrieve({}, stripeOpts).catch(() => null),

      stripe.payouts.list({ limit: 5 }, stripeOpts)
        .then((r) => r.data)
        .catch(() => [] as import("stripe").default.Payout[]),

      db.payment.findMany({
        where:   { connectedAccountId: connectedAccount.id, status: "SUCCEEDED" },
        orderBy: { capturedAt: "desc" },
        take:    10,
        select: {
          id: true, amount: true, currency: true, description: true,
          applicationFeeAmount: true, netAmount: true, capturedAt: true,
        },
      }),

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

    // Sincronizar estado real desde Stripe en background (no bloquea respuesta)
    let chargesEnabled   = connectedAccount.chargesEnabled;
    let payoutsEnabled   = connectedAccount.payoutsEnabled;
    let detailsSubmitted = connectedAccount.detailsSubmitted;
    let connectStatus    = connectedAccount.status;

    if (stripeAcc) {
      chargesEnabled   = stripeAcc.charges_enabled   ?? false;
      payoutsEnabled   = stripeAcc.payouts_enabled   ?? false;
      detailsSubmitted = stripeAcc.details_submitted ?? false;
      if (chargesEnabled && payoutsEnabled) connectStatus = "ENABLED";
      else if (detailsSubmitted)            connectStatus = "PENDING";

      if (
        connectedAccount.chargesEnabled   !== chargesEnabled ||
        connectedAccount.payoutsEnabled   !== payoutsEnabled ||
        connectedAccount.detailsSubmitted !== detailsSubmitted ||
        connectedAccount.status           !== connectStatus
      ) {
        // Fire-and-forget — no esperamos a que termine
        db.connectedAccount.update({
          where: { id: connectedAccount.id },
          data:  { chargesEnabled, payoutsEnabled, detailsSubmitted, status: connectStatus },
        }).catch(() => null);
      }
    }

    const connect = {
      stripeAccountId:  connectedAccount.stripeAccountId,
      businessName:     connectedAccount.businessName,
      email:            connectedAccount.email,
      country:          connectedAccount.country,
      defaultCurrency:  connectedAccount.defaultCurrency,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      status: connectStatus,
    };

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
    }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dashboard]", err);
    return NextResponse.json({ error: "Error al obtener datos del dashboard" }, { status: 500 });
  }
}
