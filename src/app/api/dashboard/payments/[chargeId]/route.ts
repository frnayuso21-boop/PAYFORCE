import { NextRequest, NextResponse }              from "next/server";
import { stripe }                                  from "@/lib/stripe";
import { db }                                      from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> },
) {
  try {
    const { user }    = await requireAuth(req);
    const { chargeId } = await params;

    const account = await getUserPrimaryAccount(user.id);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 404 });

    const isRealStripe = !account.stripeAccountId.startsWith("local_");

    if (isRealStripe) {
      const charge = await stripe.charges.retrieve(
        chargeId,
        { expand: ["application_fee", "payment_intent", "customer"] },
        { stripeAccount: account.stripeAccountId },
      );

      const card = charge.payment_method_details?.card;
      const fee  = charge.application_fee_amount ?? 0;

      return NextResponse.json({
        id:             charge.id,
        amount:         charge.amount,
        amountCaptured: charge.amount_captured,
        amountRefunded: charge.amount_refunded,
        currency:       charge.currency,
        status:         charge.refunded ? "refunded" : charge.status,
        refunded:       charge.refunded,
        description:    charge.description ?? null,
        created:        charge.created,
        fee,
        net:            charge.amount_captured - fee,
        receiptUrl:     charge.receipt_url ?? null,
        failureMessage: charge.failure_message ?? null,
        billingDetails: {
          name:    charge.billing_details?.name  ?? null,
          email:   charge.billing_details?.email ?? null,
          address: charge.billing_details?.address ?? null,
        },
        card: card ? {
          brand:    card.brand,
          last4:    card.last4,
          expMonth: card.exp_month,
          expYear:  card.exp_year,
          country:  card.country ?? null,
          funding:  card.funding ?? null,
        } : null,
        customer: typeof charge.customer === "object" && charge.customer !== null && !("deleted" in charge.customer)
          ? { id: charge.customer.id, email: charge.customer.email ?? null }
          : { id: typeof charge.customer === "string" ? charge.customer : null, email: null },
        paymentIntentId: typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent?.id ?? null),
        metadata: charge.metadata ?? {},
      });
    }

    // ── Fallback: datos locales ───────────────────────────────────────────
    const p = await db.payment.findFirst({
      where: { id: chargeId },
    });
    if (!p) return NextResponse.json({ error: "Charge not found" }, { status: 404 });

    return NextResponse.json({
      id:             p.id,
      amount:         p.amount,
      amountCaptured: p.amount,
      amountRefunded: p.refundedAmount ?? 0,
      currency:       p.currency,
      status:         p.refundedAmount && p.refundedAmount > 0 ? "refunded" : p.status.toLowerCase(),
      refunded:       (p.refundedAmount ?? 0) > 0,
      description:    p.description ?? null,
      created:        Math.floor(new Date(p.createdAt).getTime() / 1000),
      fee:            p.applicationFeeAmount ?? 0,
      net:            p.amount - (p.applicationFeeAmount ?? 0),
      receiptUrl:     null,
      failureMessage: null,
      billingDetails: { name: p.customerName ?? null, email: p.customerEmail ?? null, address: null },
      card:           null,
      customer:       { id: null, email: p.customerEmail ?? null },
      paymentIntentId: p.stripePaymentIntentId ?? null,
      metadata: {},
    });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[dashboard/payments/chargeId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST: reembolso ──────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> },
) {
  try {
    const { user }     = await requireAuth(req);
    const { chargeId } = await params;
    const body         = await req.json() as { amount?: number };

    const account = await getUserPrimaryAccount(user.id);
    if (!account) return NextResponse.json({ error: "No account" }, { status: 404 });

    if (account.stripeAccountId.startsWith("local_"))
      return NextResponse.json({ error: "Cuenta no conectada a Stripe" }, { status: 400 });

    const refund = await stripe.refunds.create(
      {
        charge: chargeId,
        ...(body.amount ? { amount: body.amount } : {}),
      },
      { stripeAccount: account.stripeAccountId },
    );

    return NextResponse.json({ ok: true, refundId: refund.id, status: refund.status });
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    const msg = err instanceof Error ? err.message : "Error al reembolsar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
