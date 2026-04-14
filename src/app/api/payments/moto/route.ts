import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/payments/moto
// Cobra manualmente con los datos de tarjeta proporcionados por el cliente por teléfono.
// El PaymentMethod lo crea Stripe.js en el cliente (PCI compliant) — aquí solo confirmamos.
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const body = await req.json() as {
      paymentMethodId: string;
      amount:          number;
      currency?:       string;
      description?:    string;
      customerName?:   string;
      customerEmail?:  string;
    };

    const { paymentMethodId, amount, currency = "eur", description, customerName, customerEmail } = body;

    if (!paymentMethodId) return NextResponse.json({ error: "paymentMethodId requerido" }, { status: 400 });
    if (!Number.isInteger(amount) || amount < 50)
      return NextResponse.json({ error: "Importe mínimo 0,50 €" }, { status: 400 });

    // Obtener cuenta Express del merchant
    const connectedAccount = await db.connectedAccount.findFirst({
      where:  { userId: user.id },
      select: { id: true, stripeAccountId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!connectedAccount?.stripeAccountId || connectedAccount.stripeAccountId.startsWith("local_")) {
      return NextResponse.json(
        { error: "Activa tu cuenta de cobros antes de procesar pagos por teléfono." },
        { status: 422 },
      );
    }

    const PLATFORM_FEE = Math.round(amount * 0.04) + 40;
    if (amount - PLATFORM_FEE <= 0) {
      return NextResponse.json({ error: "Importe demasiado bajo para cubrir la comisión." }, { status: 400 });
    }

    // Crear o recuperar cliente Stripe
    let stripeCustomerId: string | undefined;
    if (customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: customerEmail, name: customerName });
        stripeCustomerId = customer.id;
      }
    }

    // Destination Charge: merchant recibe el neto automáticamente en su cuenta Express
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method:         paymentMethodId,
      confirm:                true,
      description:            description || "Cobro por teléfono",
      customer:               stripeCustomerId,
      off_session:            true,
      payment_method_types:   ["card"],
      application_fee_amount: PLATFORM_FEE,
      transfer_data:          { destination: connectedAccount.stripeAccountId },
      metadata: {
        source:          "moto",
        stripeAccountId: connectedAccount.stripeAccountId,
        platformFee:     String(PLATFORM_FEE),
        customerName:    customerName ?? "",
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/virtual-terminal?status=success`,
    });

    if (pi.status === "succeeded") {
      await db.payment.create({
        data: {
          stripePaymentIntentId: pi.id,
          amount,
          currency,
          status:               "SUCCEEDED",
          applicationFeeAmount:  PLATFORM_FEE,
          netAmount:             amount - PLATFORM_FEE,
          description:           description ?? null,
          connectedAccountId:    connectedAccount.id,
        },
      }).catch(() => { /* el webhook lo registrará */ });

      return NextResponse.json({ ok: true, paymentIntentId: pi.id, status: "succeeded" });
    }

    if (pi.status === "requires_action") {
      return NextResponse.json({ ok: false, requiresAction: true, clientSecret: pi.client_secret });
    }

    return NextResponse.json({ ok: false, status: pi.status }, { status: 402 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    const msg = err instanceof Error ? err.message : "Error interno";
    console.error("[moto POST]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
