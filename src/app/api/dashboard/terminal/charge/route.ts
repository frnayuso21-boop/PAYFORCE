/**
 * POST /api/dashboard/terminal/charge
 * Cobro MOTO (terminal virtual): PaymentIntent directo en la cuenta conectada + comisión plataforma.
 * El PaymentMethod debe crearse en el cliente con Stripe.js usando { stripeAccount }.
 */
import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

import { calculateFee } from "@/lib/fees";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json() as {
      paymentMethodId?: string;
      amount?:          number;
      description?:     string;
      customerEmail?:   string;
      customerName?:    string;
      saveCard?:        boolean;
    };

    const paymentMethodId = body.paymentMethodId?.trim();
    const amount          = body.amount;
    const description     = body.description?.trim();
    const customerEmail   = body.customerEmail?.trim();
    const customerName    = body.customerName?.trim();
    const saveCard        = !!body.saveCard;

    if (!paymentMethodId?.startsWith("pm_")) {
      return NextResponse.json({ error: "paymentMethodId no válido" }, { status: 400 });
    }
    if (amount == null || !Number.isInteger(amount) || amount < 50) {
      return NextResponse.json({ error: "Importe mínimo 0,50 €" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "El concepto es obligatorio" }, { status: 400 });
    }

    const account = await getUserPrimaryAccount(session.user.id);
    if (!account?.stripeAccountId || account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json(
        { error: "Activa tu cuenta de cobros Stripe antes de usar el terminal." },
        { status: 422 },
      );
    }

    const PLATFORM_FEE = calculateFee(amount, "card");
    if (amount - PLATFORM_FEE <= 0) {
      return NextResponse.json({ error: "Importe demasiado bajo para cubrir la comisión." }, { status: 400 });
    }

    const stripeOpts = { stripeAccount: account.stripeAccountId };
    let stripeCustomerId: string | undefined;

    if (customerEmail) {
      const list = await stripe.customers.list(
        { email: customerEmail.toLowerCase(), limit: 1 },
        stripeOpts,
      );
      if (list.data.length > 0) {
        stripeCustomerId = list.data[0].id;
        if (customerName) {
          await stripe.customers.update(
            list.data[0].id,
            { name: customerName },
            stripeOpts,
          ).catch(() => {});
        }
      } else {
        const c = await stripe.customers.create(
          {
            email: customerEmail.toLowerCase(),
            name:  customerName || undefined,
          },
          stripeOpts,
        );
        stripeCustomerId = c.id;
      }
    } else if (saveCard && customerName) {
      const c = await stripe.customers.create(
        { name: customerName },
        stripeOpts,
      );
      stripeCustomerId = c.id;
    } else if (saveCard) {
      return NextResponse.json(
        { error: "Para guardar la tarjeta indica al menos el nombre del titular o un email." },
        { status: 400 },
      );
    }

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency:               "eur",
      payment_method:         paymentMethodId,
      confirm:                true,
      description,
      payment_method_types:   ["card"],
      application_fee_amount: PLATFORM_FEE,
      metadata: {
        source:         "terminal_moto",
        operatorUserId: session.user.id,
        customerEmail:  customerEmail ?? "",
        customerName:   customerName ?? "",
        saveCard:       saveCard ? "1" : "0",
      },
    };

    if (stripeCustomerId) {
      piParams.customer = stripeCustomerId;
      if (saveCard) piParams.setup_future_usage = "off_session";
    }

    const pi = await stripe.paymentIntents.create(piParams, stripeOpts);

    if (pi.status === "requires_action" && pi.client_secret) {
      return NextResponse.json({
        ok:               false,
        requiresAction:   true,
        clientSecret:     pi.client_secret,
        paymentIntentId:  pi.id,
      });
    }

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        {
          ok:     false,
          status: pi.status,
          error:  pi.last_payment_error?.message ?? "El pago no se completó",
        },
        { status: 402 },
      );
    }

    await db.payment.create({
      data: {
        stripePaymentIntentId: pi.id,
        amount,
        currency:               "eur",
        status:                 "SUCCEEDED",
        applicationFeeAmount:   PLATFORM_FEE,
        netAmount:              amount - PLATFORM_FEE,
        description,
        connectedAccountId:     account.id,
        customerEmail:          customerEmail?.toLowerCase() ?? null,
        customerName:           customerName ?? null,
        metadata:               JSON.stringify({
          source:   "terminal_moto",
          saveCard,
        }),
      },
    }).catch(() => {});

    return NextResponse.json({
      ok:              true,
      paymentIntentId: pi.id,
      status:          pi.status,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const msg = err instanceof Error ? err.message : "Error interno";
    console.error("[terminal charge]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
