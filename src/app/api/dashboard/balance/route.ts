import { NextRequest, NextResponse }              from "next/server";
import { stripe }                                  from "@/lib/stripe";
import { db }                                      from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await getUserPrimaryAccount(user.id);
    if (!account) {
      return NextResponse.json({
        available: 0, pending: 0, thisMonth: 0,
        transfers: [], currency: "eur",
      });
    }

    // Si la cuenta aún no está conectada a Stripe, devolver datos locales
    const isRealStripe = !account.stripeAccountId.startsWith("local_");

    let available = 0;
    let pending   = 0;
    let transfers: Transfer[] = [];

    if (isRealStripe) {
      // Saldo y transferencias en paralelo
      const [balance, stripeTransfers] = await Promise.all([
        stripe.balance.retrieve({}, { stripeAccount: account.stripeAccountId }),
        stripe.transfers.list({ destination: account.stripeAccountId, limit: 30 }),
      ]);

      const eurAvail = balance.available.find((b) => b.currency === "eur");
      const eurPend  = balance.pending.find((b) => b.currency === "eur");
      available = eurAvail?.amount ?? 0;
      pending   = eurPend?.amount ?? 0;

      transfers = stripeTransfers.data.map((t) => ({
        id:          t.id,
        date:        new Date(t.created * 1000).toISOString(),
        amount:      t.amount,
        currency:    t.currency,
        status:      "paid",
        destination: t.destination_payment
          ? String(t.destination_payment)
          : account.stripeAccountId,
        description: t.description ?? null,
      }));

    } else {
      // Datos locales de splits cuando no hay cuenta Stripe real
      const splits = await db.merchantSplit.findMany({
        where:   { connectedAccountId: account.id },
        orderBy: { createdAt: "desc" },
        take:    30,
      });
      available = splits
        .filter((s) => s.status === "paid")
        .reduce((a, s) => a + s.amountToPayMerchant, 0);
      pending = splits
        .filter((s) => s.status === "pending" || s.status === "processing")
        .reduce((a, s) => a + s.amountToPayMerchant, 0);
      transfers = splits.map((s) => ({
        id:          s.id,
        date:        s.createdAt.toISOString(),
        amount:      s.amountToPayMerchant,
        currency:    "eur",
        status:      s.status,
        destination: null,
        description: null,
      }));
    }

    // Total cobrado este mes (siempre desde BD)
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const agg = await db.merchantSplit.aggregate({
      where: {
        connectedAccountId: account.id,
        createdAt: { gte: monthStart },
      },
      _sum: { totalAmount: true },
    });
    const thisMonth = agg._sum.totalAmount ?? 0;

    return NextResponse.json({ available, pending, thisMonth, transfers, currency: "eur" }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[dashboard/balance]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

interface Transfer {
  id:          string;
  date:        string;
  amount:      number;
  currency:    string;
  status:      string;
  destination: string | null;
  description: string | null;
}
