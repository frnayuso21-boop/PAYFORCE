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
      // ── Stripe charges on connected account ───────────────────────────────
      const charges = await stripe.charges.list(
        { limit: 100 },
        { stripeAccount: account.stripeAccountId },
      );

      const payments = charges.data
        .filter((c) => {
          if (!status || status === "all") return true;
          if (status === "refunded")  return c.refunded;
          if (status === "succeeded") return c.status === "succeeded" && !c.refunded;
          if (status === "failed")    return c.status === "failed";
          return true;
        })
        .map((c) => {
          const fee = c.application_fee_amount ?? 0;
          const net = c.amount_captured - fee;
          return {
            id:          c.id,
            amount:      c.amount,
            amountCaptured: c.amount_captured,
            amountRefunded: c.amount_refunded,
            currency:    c.currency,
            status:      c.refunded ? "refunded" : c.status,
            description: c.description ?? null,
            customerEmail: c.billing_details?.email ?? null,
            customerName:  c.billing_details?.name  ?? null,
            created:     c.created,
            fee,
            net,
            refunded:    c.refunded,
            paymentIntentId: typeof c.payment_intent === "string"
              ? c.payment_intent
              : (c.payment_intent?.id ?? null),
          };
        });

      return NextResponse.json({ payments, hasMore: charges.has_more });
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

    return NextResponse.json({ payments, hasMore: false });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[dashboard/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
