import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";

const VALID_REASONS = new Set(["duplicate", "fraudulent", "requested_by_customer"]);

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const { payment_intent_id, amount, reason = "requested_by_customer" } = body as {
    payment_intent_id: string;
    amount?: number;
    reason?: string;
  };

  if (!payment_intent_id || !/^pi_[a-zA-Z0-9]+$/.test(payment_intent_id)) {
    return NextResponse.json({ error: "payment_intent_id inválido" }, { status: 400 });
  }
  if (amount !== undefined && (!Number.isInteger(amount) || amount <= 0)) {
    return NextResponse.json({ error: "amount debe ser un entero positivo (céntimos)" }, { status: 400 });
  }
  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: `reason inválido. Usa: ${[...VALID_REASONS].join(", ")}` }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { stripePaymentIntentId: payment_intent_id },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  if (payment.status !== "SUCCEEDED") {
    return NextResponse.json(
      { error: `No se puede reembolsar un pago con estado ${payment.status}` },
      { status: 422 },
    );
  }

  const alreadyRefunded = payment.refundedAmount ?? 0;
  const remaining       = payment.amount - alreadyRefunded;

  if (remaining <= 0) {
    return NextResponse.json({ error: "Este pago ya ha sido reembolsado completamente" }, { status: 422 });
  }
  if (amount && amount > remaining) {
    return NextResponse.json(
      { error: `El importe supera el disponible para reembolso (${(remaining / 100).toFixed(2)} €)` },
      { status: 422 },
    );
  }

  const refund = await stripe.refunds.create({
    payment_intent:         payment_intent_id,
    ...(amount ? { amount } : {}),
    reason:                 reason as "duplicate" | "fraudulent" | "requested_by_customer",
    reverse_transfer:       true,
    refund_application_fee: true,
  });

  await db.payment.update({
    where: { id: payment.id },
    data:  { refundedAmount: { increment: refund.amount } },
  });

  return NextResponse.json({
    refundId: refund.id,
    amount:   refund.amount,
    status:   refund.status,
    currency: refund.currency,
  });
});
