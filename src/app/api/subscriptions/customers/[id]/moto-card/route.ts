/**
 * POST /api/subscriptions/customers/[id]/moto-card
 * Registro MOTO: adjunta un PaymentMethod creado con Stripe.js (Elements) al Customer de Stripe
 * y lo marca como tarjeta activa en BD.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe }                 from "@/lib/stripe";
import { db }                     from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session  = await requireAuth(req);
    const { id: customerId } = await params;

    const body = await req.json() as { paymentMethodId?: string };
    const paymentMethodId = body.paymentMethodId?.trim();
    if (!paymentMethodId?.startsWith("pm_")) {
      return NextResponse.json({ error: "paymentMethodId no válido" }, { status: 400 });
    }

    const customer = await db.subscriptionCustomer.findFirst({
      where: {
        id: customerId,
        connectedAccount: { userId: session.user.id },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    if (!customer.stripeCustomerId) {
      return NextResponse.json({ error: "Cliente sin ID de Stripe" }, { status: 400 });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.stripeCustomerId,
    });

    await stripe.paymentMethods.update(paymentMethodId, {
      metadata: {
        source:   "moto",
        operator: session.user.id,
      },
    });

    await stripe.customers.update(customer.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    if (
      customer.stripePaymentMethodId &&
      customer.stripePaymentMethodId !== paymentMethodId
    ) {
      try {
        await stripe.paymentMethods.detach(customer.stripePaymentMethodId);
      } catch {
        /* la anterior puede estar ya desasociada */
      }
    }

    await db.subscriptionCustomer.update({
      where: { id: customer.id },
      data: {
        stripePaymentMethodId: paymentMethodId,
        status:                "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true, paymentMethodId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error interno";
    console.error("[moto-card POST]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
