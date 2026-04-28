import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { stripe }                    from "@/lib/stripe";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfPrevMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }
function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const now = new Date();
    const sp  = new URL(req.url).searchParams;

    // Rango personalizado opcional — si no viene, se usa el mes actual
    const rawFrom = sp.get("from");
    const rawTo   = sp.get("to");
    const customFrom = rawFrom ? startOfDay(new Date(rawFrom)) : null;
    const customTo   = rawTo   ? (() => { const d = startOfDay(new Date(rawTo)); d.setDate(d.getDate() + 1); return d; })() : null;

    const thisStart = customFrom ?? startOfMonth(now);
    const thisEnd   = customTo   ?? undefined;        // undefined = "hasta ahora"
    const prevStart = startOfPrevMonth(now);

    // Serie de puntos para el gráfico: 1 punto por día del rango (máx 90)
    const rangeStart = customFrom ?? startOfMonth(now);
    const rangeEnd   = customTo   ?? now;
    const rangeMs    = rangeEnd.getTime() - rangeStart.getTime();
    const rangeDays  = Math.min(Math.ceil(rangeMs / 86400000) + 1, 90);
    const days: { date: string; start: Date; end: Date }[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d     = new Date(rangeEnd);
      d.setDate(d.getDate() - i);
      const start = startOfDay(d);
      const end   = new Date(start);
      end.setDate(end.getDate() + 1);
      days.push({ date: toISODate(start), start, end });
    }

    const accountIds = await getUserAccountIds(user.id);

    const emptyChart = days.map(({ date }) => ({ date, total: 0 }));
    const emptyResponse = {
      month:            now.toLocaleString("es-ES", { month: "long", year: "numeric" }),
      totalVolume:      0,
      txCount:          0,
      totalFees:        0,
      availableBalance: 0,
      pendingBalance:   0,
      estimatedBalance: 0,
      comparison:       { volumeChange: null, txChange: null, feesChange: null },
      chartSeries:      emptyChart,
    };

    if (accountIds.length === 0) {
      return NextResponse.json(emptyResponse, {
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
      });
    }

    const accountFilter = { connectedAccountId: { in: accountIds } };

    // Obtener la cuenta primaria del merchant para consultar su balance en Stripe
    const primaryAccount = await db.connectedAccount.findFirst({
      where:   { id: { in: accountIds } },
      orderBy: { createdAt: "asc" },
      select:  { stripeAccountId: true, defaultCurrency: true },
    });

    const stripeOpts = primaryAccount?.stripeAccountId
      ? { stripeAccount: primaryAccount.stripeAccountId }
      : undefined;

    const thisWhere = thisEnd
      ? { status: "SUCCEEDED", createdAt: { gte: thisStart, lt: thisEnd }, ...accountFilter }
      : { status: "SUCCEEDED", createdAt: { gte: thisStart }, ...accountFilter };

    const [thisPeriod, prevPeriod, balance, ...dailyAggs] = await Promise.all([
      db.payment.aggregate({
        where: thisWhere,
        _sum:   { amount: true, applicationFeeAmount: true },
        _count: { id: true },
      }),
      db.payment.aggregate({
        where: { status: "SUCCEEDED", createdAt: { gte: prevStart, lt: thisStart }, ...accountFilter },
        _sum:   { amount: true, applicationFeeAmount: true },
        _count: { id: true },
      }),
      // Balance del connected account del merchant (no de la plataforma)
      stripeOpts
        ? stripe.balance.retrieve({}, stripeOpts).catch(() => null)
        : Promise.resolve(null),
      ...days.map(({ start, end }) =>
        db.payment.aggregate({
          where: { status: "SUCCEEDED", createdAt: { gte: start, lt: end }, ...accountFilter },
          _sum:  { amount: true, applicationFeeAmount: true },
        })
      ),
    ]);

    const chartSeries = days.map(({ date }, i) => {
      const gross = dailyAggs[i]._sum.amount ?? 0;
      const fees  = dailyAggs[i]._sum.applicationFeeAmount ?? 0;
      return { date, total: gross, net: gross - fees };
    });

    const totalVolume = thisPeriod._sum.amount              ?? 0;
    const totalFees   = thisPeriod._sum.applicationFeeAmount ?? 0;
    const txCount     = thisPeriod._count.id                 ?? 0;
    const prevVolume  = prevPeriod._sum.amount              ?? 0;
    const prevFees    = prevPeriod._sum.applicationFeeAmount ?? 0;
    const prevTx      = prevPeriod._count.id                 ?? 0;

    const pct = (curr: number, prev: number) =>
      prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10;

    const currency = primaryAccount?.defaultCurrency ?? "eur";
    const availableBalance =
      balance?.available.find((b) => b.currency === currency)?.amount ?? 0;
    const pendingBalance =
      balance?.pending.find((b) => b.currency === currency)?.amount   ?? 0;

    return NextResponse.json({
      month:            now.toLocaleString("es-ES", { month: "long", year: "numeric" }),
      totalVolume,
      txCount,
      totalFees,
      availableBalance,
      pendingBalance,
      estimatedBalance: availableBalance + pendingBalance,
      comparison: {
        volumeChange: pct(totalVolume, prevVolume),
        txChange:     pct(txCount, prevTx),
        feesChange:   pct(totalFees, prevFees),
      },
      chartSeries,
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[overview]", err);
    return NextResponse.json({ error: "Error al obtener métricas" }, { status: 500 });
  }
}
