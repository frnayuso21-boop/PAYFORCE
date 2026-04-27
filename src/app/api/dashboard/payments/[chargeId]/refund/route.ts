import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STRIPE_ERROR_MESSAGES: Record<string, string> = {
  charge_already_refunded: "Este pago ya ha sido reembolsado.",
  insufficient_funds:      "Fondos insuficientes para procesar el reembolso.",
  charge_disputed:         "No se puede reembolsar un pago que está en disputa.",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> },
) {
  try {
    const { user } = await requireAuth(req);
    const { chargeId } = await params;

    const account = await getUserPrimaryAccount(user.id);
    if (!account) return NextResponse.json({ error: "Sin cuenta" }, { status: 404 });

    const isRealStripe = !account.stripeAccountId.startsWith("local_");
    if (!isRealStripe) {
      return NextResponse.json({ error: "Reembolsos solo disponibles con cuenta Stripe conectada." }, { status: 400 });
    }

    // Verificar que el charge pertenece a este merchant
    const charge = await stripe.charges.retrieve(
      chargeId,
      {},
      { stripeAccount: account.stripeAccountId },
    );

    // Validar que es reembolsable
    if (charge.status !== "succeeded") {
      return NextResponse.json({ error: "Solo se pueden reembolsar pagos exitosos." }, { status: 400 });
    }
    if (charge.refunded) {
      return NextResponse.json({ error: "Este pago ya ha sido reembolsado." }, { status: 400 });
    }
    if (charge.amount_refunded >= charge.amount) {
      return NextResponse.json({ error: "El importe ya ha sido reembolsado completamente." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({})) as {
      amount?: number;
      reason?: string;
    };

    const validReasons = ["requested_by_customer", "fraudulent", "duplicate"];
    const reason = validReasons.includes(body.reason ?? "")
      ? (body.reason as "requested_by_customer" | "fraudulent" | "duplicate")
      : "requested_by_customer";

    // Validar importe parcial si se especifica
    if (body.amount !== undefined) {
      const remaining = charge.amount - charge.amount_refunded;
      if (body.amount <= 0 || body.amount > remaining) {
        return NextResponse.json({
          error: `El importe debe estar entre 0,01€ y ${(remaining / 100).toFixed(2)}€.`,
        }, { status: 400 });
      }
    }

    // Crear reembolso en Stripe
    const refund = await stripe.refunds.create(
      {
        charge: chargeId,
        amount: body.amount || undefined,
        reason,
        refund_application_fee: false,
        reverse_transfer: true,
      },
      { stripeAccount: account.stripeAccountId },
    );

    // Actualizar BD si existe el registro local
    const piId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (piId) {
      await db.payment.updateMany({
        where: { stripePaymentIntentId: piId },
        data:  { status: "refunded", refundedAmount: charge.amount },
      }).catch(() => {}); // no bloqueante
    }

    return NextResponse.json({
      success: true,
      refund,
      message: "Reembolso procesado correctamente.",
    });

  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    // Errores específicos de Stripe
    if (
      typeof err === "object" && err !== null &&
      "code" in err && typeof (err as { code: unknown }).code === "string"
    ) {
      const code = (err as { code: string }).code;
      const friendly = STRIPE_ERROR_MESSAGES[code];
      if (friendly) {
        return NextResponse.json({ error: friendly }, { status: 400 });
      }
    }

    console.error("[refund]", err);
    return NextResponse.json({ error: "Error al procesar el reembolso." }, { status: 500 });
  }
}
