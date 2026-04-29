/**
 * GET /api/dashboard/all
 *
 * Endpoint consolidado para el dashboard principal.
 * Devuelve en 1 sola llamada: overview del mes, últimos 20 pagos, y
 * balance de Stripe. Reduce 3-4 requireAuth a 1 sola.
 */
import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({
      where:   { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    const empty = {
      overview: { available: 0, pending: 0, totalMonth: 0, transactionsMonth: 0 },
      payments: [],
      account:  { businessName: "", chargesEnabled: false, payoutsEnabled: false },
    };

    if (!account || account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json(empty, {
        headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
      });
    }

    const now            = new Date();
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const stripeOpts     = { stripeAccount: account.stripeAccountId };

    const [payments, monthTotal, stripeBalance] = await Promise.all([
      db.payment.findMany({
        where:   { connectedAccountId: account.id },
        orderBy: { createdAt: "desc" },
        take:    20,
        select: {
          id: true, amount: true, currency: true, status: true,
          description: true, customerEmail: true, createdAt: true,
          stripeChargeId: true, applicationFeeAmount: true, netAmount: true,
        },
      }),
      db.payment.aggregate({
        where: {
          connectedAccountId: account.id,
          createdAt:          { gte: startOfMonth },
          status:             "SUCCEEDED",
        },
        _sum:   { amount: true },
        _count: { _all: true },
      }),
      stripe.balance.retrieve({}, stripeOpts).catch(() => null),
    ]);

    const currency  = account.defaultCurrency ?? "eur";
    const available = stripeBalance?.available.find((b) => b.currency === currency)?.amount ?? 0;
    const pending   = stripeBalance?.pending.find((b) => b.currency === currency)?.amount   ?? 0;

    return NextResponse.json({
      overview: {
        available,
        pending,
        totalMonth:         monthTotal._sum.amount   ?? 0,
        transactionsMonth:  monthTotal._count._all   ?? 0,
      },
      payments: payments.map((p) => ({
        id:            p.id,
        amount:        p.amount,
        currency:      p.currency,
        status:        p.status,
        description:   p.description,
        customerEmail: p.customerEmail,
        createdAt:     p.createdAt,
        stripeChargeId: p.stripeChargeId,
        fee:           p.applicationFeeAmount ?? 0,
        net:           p.netAmount            ?? 0,
      })),
      account: {
        businessName:    account.businessName,
        chargesEnabled:  account.chargesEnabled,
        payoutsEnabled:  account.payoutsEnabled,
      },
    }, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
    });

  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[dashboard/all]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
