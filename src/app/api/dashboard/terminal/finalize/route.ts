/**
 * POST /api/dashboard/terminal/finalize
 * Tras 3D Secure (confirmCardPayment en el cliente), persiste el pago si el PI ya está succeeded.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { requireAuth, getUserPrimaryAccount, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { paymentIntentId } = await req.json() as { paymentIntentId?: string };
    if (!paymentIntentId?.startsWith("pi_")) {
      return NextResponse.json({ error: "paymentIntentId no válido" }, { status: 400 });
    }

    const account = await getUserPrimaryAccount(session.user.id);
    if (!account?.stripeAccountId || account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json({ error: "Cuenta no disponible" }, { status: 422 });
    }

    const pi = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {},
      { stripeAccount: account.stripeAccountId },
    );

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { ok: false, status: pi.status, error: "El pago aún no se completó" },
        { status: 402 },
      );
    }

    const existing = await db.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (existing) {
      return NextResponse.json({ ok: true, paymentIntentId, alreadyRecorded: true });
    }

    const amount = pi.amount;
    const PLATFORM_FEE = pi.application_fee_amount ?? 0;

    await db.payment.create({
      data: {
        stripePaymentIntentId: paymentIntentId,
        amount,
        currency:               pi.currency ?? "eur",
        status:                 "SUCCEEDED",
        applicationFeeAmount:   PLATFORM_FEE,
        netAmount:              amount - PLATFORM_FEE,
        description:            pi.description ?? "Terminal virtual",
        connectedAccountId:     account.id,
        customerEmail:          typeof pi.receipt_email === "string" ? pi.receipt_email : null,
        metadata:               JSON.stringify({ source: "terminal_moto", finalized: true }),
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, paymentIntentId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[terminal finalize]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
