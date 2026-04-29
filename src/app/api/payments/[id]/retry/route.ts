import { NextRequest, NextResponse } from "next/server";
import { randomBytes }               from "crypto";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";
import { checkRateLimit }            from "@/lib/rate-limit";
import QRCode                        from "qrcode";

export const dynamic = "force-dynamic";

// ─── Constantes ────────────────────────────────────────────────────────────────

import { calculateFee } from "@/lib/fees";

function calcPlatformFee(amount: number) {
  return calculateFee(amount);
}

function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost")) return envUrl.replace(/\/$/, "");
  const host  = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// ─── Pagos que se pueden reintentar ──────────────────────────────────────────

const RETRYABLE_STATUSES = new Set([
  "FAILED", "CANCELED", "REQUIRES_PAYMENT_METHOD",
]);

// ─── POST /api/payments/[id]/retry ────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth(req);
    const userId  = session.user.id;
    const { id }  = await params;

    const rl = checkRateLimit(`retry:${userId}`, { windowMs: 60_000, max: 10 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Inténtalo de nuevo en un momento." },
        { status: 429 },
      );
    }

    // ── 1. Buscar el pago original (verificando propiedad) ────────────────────
    const payment = await db.payment.findFirst({
      where: {
        id,
        connectedAccount: { userId },
      },
      include: {
        connectedAccount: {
          select: {
            id:             true,
            stripeAccountId: true,
            userId:         true,
            businessName:   true,
          },
        },
        paymentLink: {
          select: {
            description:   true,
            customerEmail: true,
            customerName:  true,
            currency:      true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado o no tienes permiso para reintentarlo." },
        { status: 404 },
      );
    }

    // ── 2. Verificar que el pago puede reintentarse ───────────────────────────
    if (!RETRYABLE_STATUSES.has(payment.status)) {
      return NextResponse.json(
        { error: `Este pago no puede reintentarse (estado: ${payment.status}).` },
        { status: 422 },
      );
    }

    const account    = payment.connectedAccount;
    const currency   = payment.currency;
    const amount     = payment.amount;
    const platformFee = calcPlatformFee(amount);
    const description = payment.paymentLink?.description ?? payment.description ?? undefined;
    const customerEmail = payment.paymentLink?.customerEmail ?? undefined;
    const customerName  = payment.paymentLink?.customerName  ?? undefined;

    const token = randomBytes(16).toString("hex");

    // ── 3a. Modo test ─────────────────────────────────────────────────────────
    if (account.stripeAccountId.startsWith("local_")) {
      const link = await db.paymentLink.create({
        data: {
          token,
          stripePaymentIntentId: `pi_test_${token}`,
          connectedAccountId: account.id,
          createdById:        userId,
          amount,
          currency,
          applicationFeeAmount: 0,
          description:   description   ?? null,
          customerEmail: customerEmail ?? null,
          customerName:  customerName  ?? null,
          status:        "open",
          metadata: JSON.stringify({ testMode: "true", retriedFromPaymentId: id }),
        },
      });

      const url = `${getBaseUrl(req)}/pay/${link.token}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width:          300,
        margin:         2,
        color:          { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });

      return NextResponse.json({ token: link.token, url, qrDataUrl, testMode: true });
    }

    // ── 3b. Stripe real ────────────────────────────────────────────────────────
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      application_fee_amount: platformFee,
      transfer_data: { destination: account.stripeAccountId },
      automatic_payment_methods: { enabled: true },
      metadata: {
        paymentLinkToken:       token,
        stripeAccountId:        account.stripeAccountId,
        platformFee:            String(platformFee),
        retriedFromPaymentId:   id,
      },
    });

    const link = await db.paymentLink.create({
      data: {
        token,
        stripePaymentIntentId: pi.id,
        connectedAccountId:    account.id,
        createdById:           userId,
        amount,
        currency,
        applicationFeeAmount:  platformFee,
        description:   description   ?? null,
        customerEmail: customerEmail ?? null,
        customerName:  customerName  ?? null,
        status:        "open",
        metadata: JSON.stringify({ retriedFromPaymentId: id }),
      },
    });

    const url = `${getBaseUrl(req)}/pay/${link.token}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width:          300,
      margin:         2,
      color:          { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({ token: link.token, url, qrDataUrl, testMode: false });

  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[payments/retry POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
