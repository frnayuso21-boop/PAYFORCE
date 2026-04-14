import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";
import { checkRateLimit }            from "@/lib/rate-limit";

const VALID_REASONS = new Set(["duplicate", "fraudulent", "requested_by_customer"]);

interface RefundBody {
  payment_intent_id: string;
  amount?:           number;
  reason?:           "duplicate" | "fraudulent" | "requested_by_customer";
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    // ── Rate limit: 10 req/min por usuario ───────────────────────────────────
    const rl = checkRateLimit(`refund:${user.id}`, { windowMs: 60_000, max: 10 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes de reembolso. Espera unos segundos." },
        {
          status:  429,
          headers: {
            "Retry-After":           String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const body = (await req.json()) as RefundBody;
    const { payment_intent_id, amount, reason = "requested_by_customer" } = body;

    if (!payment_intent_id || typeof payment_intent_id !== "string") {
      return NextResponse.json(
        { error: "payment_intent_id es obligatorio" },
        { status: 400 },
      );
    }
    if (!/^pi_[a-zA-Z0-9]+$/.test(payment_intent_id)) {
      return NextResponse.json(
        { error: "payment_intent_id no tiene un formato válido" },
        { status: 400 },
      );
    }
    if (amount !== undefined && (!Number.isInteger(amount) || amount <= 0)) {
      return NextResponse.json(
        { error: "amount debe ser un entero positivo (céntimos)" },
        { status: 400 },
      );
    }
    if (reason && !VALID_REASONS.has(reason)) {
      return NextResponse.json(
        { error: `reason inválido. Usa: ${[...VALID_REASONS].join(", ")}` },
        { status: 400 },
      );
    }

    // Buscar pago en BD
    const payment = await db.payment.findUnique({
      where: { stripePaymentIntentId: payment_intent_id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    // Verificar que el pago pertenece al usuario autenticado.
    // Sin cuentas propias → no puede reembolsar nada.
    // Con cuentas → el pago debe pertenecer a una de ellas.
    const accountIds = await getUserAccountIds(user.id);
    if (accountIds.length === 0 || !accountIds.includes(payment.connectedAccountId)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (payment.status !== "SUCCEEDED") {
      return NextResponse.json(
        { error: `No se puede reembolsar un pago con estado ${payment.status}` },
        { status: 422 },
      );
    }

    if (amount) {
      const alreadyRefunded = payment.refundedAmount ?? 0;
      const remaining       = payment.amount - alreadyRefunded;
      if (amount > remaining) {
        return NextResponse.json(
          { error: `El importe excede el disponible para reembolso (${remaining} céntimos)` },
          { status: 422 },
        );
      }
    }

    // Crear reembolso en Stripe.
    // Con Destination Charges:
    //   · reverse_transfer: true  → revierte la transferencia al connected account
    //   · refund_application_fee: true → devuelve la comisión de plataforma al cliente
    const refund = await stripe.refunds.create({
      payment_intent:         payment_intent_id,
      ...(amount ? { amount } : {}),
      reason,
      reverse_transfer:       true,
      refund_application_fee: true,
    });

    // Actualizar BD
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
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[refund]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
