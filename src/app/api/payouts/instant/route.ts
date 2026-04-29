import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError }    from "@/lib/auth";

export const dynamic = "force-dynamic";

const INSTANT_FEE_RATE = 0.015; // 1,5 % — solo si el payout se procesa como instant

// ─── Verifica si la cuenta tiene instant payouts disponibles ─────────────────
async function checkInstantAvailable(stripeAccountId: string): Promise<boolean> {
  try {
    const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
    const balance       = await stripe.balance.retrieve({}, { stripeAccount: stripeAccountId });
    const availableEur  = balance.available.find((b) => b.currency === "eur");
    return (
      stripeAccount.capabilities?.transfers === "active" &&
      (availableEur?.amount ?? 0) > 0
    );
  } catch {
    return false;
  }
}

// ─── GET /api/payouts/instant ── Info de disponibilidad y saldo ───────────────
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) return NextResponse.json({ availableCents: 0, currency: "eur", instantAvailable: false });

    const isRealStripe = !account.stripeAccountId.startsWith("local_");

    // Saldo disponible en BD (merchantSplits)
    const agg = await db.merchantSplit.aggregate({
      where: { connectedAccountId: account.id, status: "pending" },
      _sum:  { amountToPayMerchant: true },
    });
    const availableCents = agg._sum.amountToPayMerchant ?? 0;

    // Verificar disponibilidad de instant en Stripe
    const instantAvailable = isRealStripe
      ? await checkInstantAvailable(account.stripeAccountId)
      : false;

    // Fee solo aplica si es instant
    const feeCents = instantAvailable
      ? Math.max(Math.ceil(availableCents * INSTANT_FEE_RATE), 50)
      : 0;
    const netCents = availableCents - feeCents;

    // IBAN del merchant
    let iban: string | undefined;
    let accountHolder: string | undefined;
    if (account.stripeMetadata) {
      try {
        const meta = JSON.parse(account.stripeMetadata) as { iban?: string; accountHolder?: string };
        iban = meta.iban; accountHolder = meta.accountHolder;
      } catch { /* ignora */ }
    }

    const history = await db.instantPayoutRequest.findMany({
      where:   { connectedAccountId: account.id },
      orderBy: { createdAt: "desc" },
      take:    10,
      select:  { id: true, requestedAmount: true, fee: true, netAmount: true,
                 status: true, createdAt: true, processedAt: true },
    });

    return NextResponse.json({
      availableCents, feeCents, netCents,
      feeRate:        INSTANT_FEE_RATE,
      instantAvailable,
      currency:       account.defaultCurrency ?? "eur",
      iban, accountHolder, history,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST /api/payouts/instant ── Solicitar payout ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body     = await req.json() as { amount?: number };

    const account = await db.connectedAccount.findFirst({ where: { userId: user.id } });
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const isRealStripe = !account.stripeAccountId.startsWith("local_");
    const currency     = account.defaultCurrency ?? "eur";

    // Saldo disponible
    const agg = await db.merchantSplit.aggregate({
      where: { connectedAccountId: account.id, status: "pending" },
      _sum:  { amountToPayMerchant: true },
    });
    const availableCents = agg._sum.amountToPayMerchant ?? 0;

    if (availableCents < 100)
      return NextResponse.json({ error: "Saldo insuficiente. Mínimo 1,00 € para solicitar payout." }, { status: 400 });

    const requestedAmount = body.amount
      ? Math.min(body.amount, availableCents)
      : availableCents;

    if (requestedAmount < 100)
      return NextResponse.json({ error: "Importe mínimo 1,00 €" }, { status: 400 });

    // Verificar disponibilidad instant antes de calcular fee
    const instantAvailable = isRealStripe
      ? await checkInstantAvailable(account.stripeAccountId)
      : false;

    // Fee solo si instant; si cae a standard no se cobra
    const feeCents = instantAvailable
      ? Math.max(Math.ceil(requestedAmount * INSTANT_FEE_RATE), 50)
      : 0;
    const amountAfterFee = requestedAmount - feeCents;

    // Crear registro en BD (fee 0 si standard)
    const request = await db.instantPayoutRequest.create({
      data: {
        connectedAccountId: account.id,
        requestedAmount,
        fee:       feeCents,
        netAmount: amountAfterFee,
        currency,
        status:    "PENDING",
      },
    });

    let stripePayoutId: string | undefined;
    let method: "instant" | "standard" = "standard";
    let message: string;

    if (isRealStripe) {
      // ── Intentar instant; fallback automático a standard ───────────────────
      try {
        // Obtener el saldo instant_available con net_available (ya descuenta la comisión de plataforma)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const balance = await (stripe.balance.retrieve as any)(
          { expand: ["instant_available.net_available"] },
          { stripeAccount: account.stripeAccountId },
        );

        const instantBalance = (balance as unknown as {
          instant_available?: Array<{ amount: number; currency: string; net_available?: Array<{ amount: number }> }>
        }).instant_available?.[0];

        if (!instantBalance || instantBalance.amount <= 0) {
          throw new Error("No hay saldo disponible para instant payout");
        }

        const netAvailable = instantBalance.net_available?.[0];
        const payoutAmount = netAvailable ? netAvailable.amount : instantBalance.amount;

        const po = await stripe.payouts.create(
          { amount: payoutAmount, currency, method: "instant",
            metadata: { instantPayoutRequestId: request.id, merchantAccountId: account.id } },
          { stripeAccount: account.stripeAccountId },
        );
        stripePayoutId = po.id;
        method         = "instant";
        message        = `Pago instantáneo de ${(payoutAmount / 100).toFixed(2)} € en proceso. Llegará en minutos.`;
      } catch {
        // Fallback a standard — sin comisión extra, se devuelve el fee al merchant
        // Actualizar registro para reflejar fee = 0 en standard
        await db.instantPayoutRequest.update({
          where: { id: request.id },
          data:  { fee: 0, netAmount: requestedAmount },
        });

        const po = await stripe.payouts.create(
          { amount: requestedAmount, currency, method: "standard",
            metadata: { instantPayoutRequestId: request.id, merchantAccountId: account.id } },
          { stripeAccount: account.stripeAccountId },
        );
        stripePayoutId = po.id;
        method         = "standard";
        message        = `Payout instantáneo no disponible. Se ha procesado como transferencia estándar de ${(requestedAmount / 100).toFixed(2)} € sin comisión. Llegará en 2–3 días hábiles.`;
      }

      await db.instantPayoutRequest.update({
        where: { id: request.id },
        data:  { status: "PROCESSING", stripePayoutId },
      });
    } else {
      // Cuenta local (test): simular éxito
      method  = "standard";
      message = `Solicitud registrada. PayForce procesará la transferencia de ${(requestedAmount / 100).toFixed(2)} € en los próximos 30 minutos.`;
    }

    // Marcar splits como "processing"
    await db.merchantSplit.updateMany({
      where: { connectedAccountId: account.id, status: "pending" },
      data:  { status: "processing" },
    });

    return NextResponse.json({
      ok: true, requestId: request.id,
      requestedAmount,
      fee:            method === "instant" ? feeCents : 0,
      netAmount:      method === "instant" ? amountAfterFee : requestedAmount,
      status:         stripePayoutId ? "PROCESSING" : "PENDING",
      method,
      stripePayoutId: stripePayoutId ?? null,
      message,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 });
  }
}
