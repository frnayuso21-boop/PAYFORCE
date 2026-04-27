import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

const INSTANT_FEE_RATE = 0.015; // 1,5 %

// ─── GET /api/payouts/instant ── Balance disponible para retirar ──────────────
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({
      where: { userId: user.id },
    });
    if (!account) return NextResponse.json({ availableCents: 0, currency: "eur" });

    // Saldo pendiente de pago al merchant
    const agg = await db.merchantSplit.aggregate({
      where:  { connectedAccountId: account.id, status: "pending" },
      _sum:   { amountToPayMerchant: true },
    });
    const availableCents = agg._sum.amountToPayMerchant ?? 0;
    let feeCents         = Math.ceil(availableCents * INSTANT_FEE_RATE);
    if (feeCents < 50) feeCents = 50;
    const netCents       = availableCents - feeCents;

    // IBAN guardado en stripeMetadata
    let iban: string | undefined;
    let accountHolder: string | undefined;
    if (account.stripeMetadata) {
      try {
        const meta = JSON.parse(account.stripeMetadata) as { iban?: string; accountHolder?: string };
        iban          = meta.iban;
        accountHolder = meta.accountHolder;
      } catch { /* ignora */ }
    }

    // Solicitudes anteriores
    const history = await db.instantPayoutRequest.findMany({
      where:   { connectedAccountId: account.id },
      orderBy: { createdAt: "desc" },
      take:    10,
      select:  { id: true, requestedAmount: true, fee: true, netAmount: true,
                 status: true, createdAt: true, processedAt: true },
    });

    return NextResponse.json({
      availableCents,
      feeCents,
      netCents,
      feeRate:      INSTANT_FEE_RATE,
      currency:     account.defaultCurrency ?? "eur",
      iban,
      accountHolder,
      history,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/payouts/instant ── Solicitar pago inmediato ───────────────────
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const body = await req.json() as { amount?: number };

    const account = await db.connectedAccount.findFirst({
      where: { userId: user.id },
    });
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    // Calcular saldo disponible
    const agg = await db.merchantSplit.aggregate({
      where: { connectedAccountId: account.id, status: "pending" },
      _sum:  { amountToPayMerchant: true },
    });
    const availableCents = agg._sum.amountToPayMerchant ?? 0;

    if (availableCents < 100)
      return NextResponse.json({ error: "Saldo insuficiente. Mínimo 1,00 € para solicitar pago inmediato." }, { status: 400 });

    // El merchant puede solicitar un importe parcial o el total
    const requestedAmount = body.amount
      ? Math.min(body.amount, availableCents)
      : availableCents;

    if (requestedAmount < 100)
      return NextResponse.json({ error: "Importe mínimo 1,00 €" }, { status: 400 });

    let feeCents    = Math.ceil(requestedAmount * INSTANT_FEE_RATE);
    if (feeCents < 50) feeCents = 50;
    const netCents  = requestedAmount - feeCents;

    // Leer IBAN del merchant
    let iban: string | undefined;
    let accountHolder: string | undefined;
    if (account.stripeMetadata) {
      try {
        const meta = JSON.parse(account.stripeMetadata) as { iban?: string; accountHolder?: string };
        iban          = meta.iban;
        accountHolder = meta.accountHolder;
      } catch { /* ignora */ }
    }

    // Crear solicitud en BD
    const request = await db.instantPayoutRequest.create({
      data: {
        connectedAccountId: account.id,
        requestedAmount,
        fee:        feeCents,
        netAmount:  netCents,
        currency:   account.defaultCurrency ?? "eur",
        iban:       iban ?? null,
        accountHolder: accountHolder ?? null,
        status:     "PENDING",
      },
    });

    // Intentar Stripe Instant Payout (disponible en algunos mercados)
    let stripePayoutId: string | undefined;
    let stripeError: string | undefined;
    try {
      const po = await stripe.payouts.create({
        amount:   netCents,
        currency: account.defaultCurrency ?? "eur",
        method:   "instant",
        metadata: {
          instantPayoutRequestId: request.id,
          merchantAccountId:      account.id,
        },
      });
      stripePayoutId = po.id;
      await db.instantPayoutRequest.update({
        where: { id: request.id },
        data:  { status: "PROCESSING", stripePayoutId: po.id },
      });
    } catch (e) {
      // Si Stripe instant no está disponible (común en EU) → queda PENDING para proceso manual
      stripeError = e instanceof Error ? e.message : "Stripe instant no disponible";
      console.warn("[instant-payout] Stripe instant failed, manual processing:", stripeError);
    }

    // Marcar splits como "processing" para que no se dupliquen en otra solicitud
    await db.merchantSplit.updateMany({
      where: { connectedAccountId: account.id, status: "pending" },
      data:  { status: "processing" },
    });

    return NextResponse.json({
      ok:             true,
      requestId:      request.id,
      requestedAmount,
      fee:            feeCents,
      netAmount:      netCents,
      status:         stripePayoutId ? "PROCESSING" : "PENDING",
      stripePayoutId: stripePayoutId ?? null,
      message:        stripePayoutId
        ? `Pago de €${(netCents/100).toFixed(2)} en proceso. Llegará en minutos.`
        : `Solicitud registrada. PayForce procesará la transferencia de €${(netCents/100).toFixed(2)} en los próximos 30 minutos.`,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[instant-payout POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}
