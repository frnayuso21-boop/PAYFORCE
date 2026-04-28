import { NextRequest, NextResponse }              from "next/server";
import { stripe }                                  from "@/lib/stripe";
import { db }                                      from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user }   = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 300);
    const status = searchParams.get("status") ?? "";          // succeeded|failed|refunded
    const startingAfter = searchParams.get("starting_after"); // cursor for pagination

    const account = await getUserPrimaryAccount(user.id);
    if (!account) return NextResponse.json({ payments: [], hasMore: false });

    const isRealStripe = !account.stripeAccountId.startsWith("local_");

    if (isRealStripe) {
      // ── Stripe: obtener todos los charges paginando hasta el final ────────
      const allCharges: import("stripe").Stripe.Charge[] = [];
      let lastId: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const page = await stripe.charges.list(
          { limit: 100, ...(lastId ? { starting_after: lastId } : {}) },
          { stripeAccount: account.stripeAccountId },
        );
        allCharges.push(...page.data);
        hasMore = page.has_more;
        if (page.data.length > 0) lastId = page.data[page.data.length - 1].id;
      }

      // ── BD: pagos locales (pueden incluir pagos de test o sin charge en Stripe)
      const dbPayments = await db.payment.findMany({
        where:   { connectedAccountId: account.id },
        orderBy: { createdAt: "desc" },
      });

      // IDs de Stripe ya presentes para evitar duplicados
      const stripeIds = new Set(allCharges.map((c) => c.id));
      const piIds     = new Set(allCharges.map((c) =>
        typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id,
      ).filter(Boolean));

      // Mapear charges de Stripe al formato unificado
      const fromStripe = allCharges.map((c) => {
        const fee = c.application_fee_amount ?? 0;
        const net = c.amount_captured - fee;
        return {
          id:             c.id,
          amount:         c.amount,
          amountCaptured: c.amount_captured,
          amountRefunded: c.amount_refunded,
          currency:       c.currency,
          status:         c.refunded ? "refunded" : c.status,
          description:    c.description ?? null,
          customerEmail:  c.billing_details?.email ?? null,
          customerName:   c.billing_details?.name  ?? null,
          created:        c.created,
          fee,
          net,
          refunded:       c.refunded,
          paymentIntentId: typeof c.payment_intent === "string"
            ? c.payment_intent
            : (c.payment_intent?.id ?? null),
          source: "stripe" as const,
        };
      });

      // Pagos en BD que NO están ya representados por un charge de Stripe
      const fromDb = dbPayments
        .filter((p) => {
          if (p.stripeChargeId && stripeIds.has(p.stripeChargeId)) return false;
          if (p.stripePaymentIntentId && piIds.has(p.stripePaymentIntentId)) return false;
          return true;
        })
        .map((p) => ({
          id:             p.stripeChargeId ?? p.id,
          amount:         p.amount,
          amountCaptured: p.amount,
          amountRefunded: p.refundedAmount ?? 0,
          currency:       p.currency,
          status:         (p.refundedAmount ?? 0) > 0 ? "refunded" : p.status.toLowerCase(),
          description:    p.description ?? null,
          customerEmail:  p.customerEmail ?? null,
          customerName:   p.customerName  ?? null,
          created:        Math.floor(new Date(p.createdAt).getTime() / 1000),
          fee:            p.applicationFeeAmount ?? 0,
          net:            p.amount - (p.applicationFeeAmount ?? 0),
          refunded:       (p.refundedAmount ?? 0) > 0,
          paymentIntentId: p.stripePaymentIntentId ?? null,
          source: "db" as const,
        }));

      // Unión ordenada por fecha desc
      const merged = [...fromStripe, ...fromDb].sort((a, b) => b.created - a.created);

      // Filtro de estado
      const payments = merged.filter((p) => {
        if (!status || status === "all") return true;
        if (status === "refunded")  return p.refunded;
        if (status === "succeeded") return p.status === "succeeded" && !p.refunded;
        if (status === "failed")    return p.status === "failed";
        return true;
      });

      return NextResponse.json({ payments, hasMore: false }, {
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
      });
    }

    // ── Fallback: datos locales de BD ─────────────────────────────────────
    const accountIds = (await db.connectedAccount.findMany({
      where:  { userId: user.id },
      select: { id: true },
    })).map((a) => a.id);

    const dbPayments = await db.payment.findMany({
      where:   { connectedAccountId: { in: accountIds } },
      orderBy: { createdAt: "desc" },
      take:    limit,
    });

    const payments = dbPayments.map((p) => ({
      id:          p.id,
      amount:      p.amount,
      amountCaptured: p.amount,
      amountRefunded: p.refundedAmount ?? 0,
      currency:    p.currency,
      status:      p.refundedAmount && p.refundedAmount > 0 ? "refunded" : p.status.toLowerCase(),
      description: p.description ?? null,
      customerEmail: p.customerEmail ?? null,
      customerName:  p.customerName  ?? null,
      created:     Math.floor(new Date(p.createdAt).getTime() / 1000),
      fee:         p.applicationFeeAmount ?? 0,
      net:         p.amount - (p.applicationFeeAmount ?? 0),
      refunded:    (p.refundedAmount ?? 0) > 0,
      paymentIntentId: p.stripePaymentIntentId ?? null,
    }));

    return NextResponse.json({ payments, hasMore: false }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[dashboard/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
