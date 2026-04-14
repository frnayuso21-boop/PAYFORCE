/**
 * GET  /api/payouts  — Historial real de payouts del merchant desde Stripe
 * POST /api/payouts  — Solicitar payout estándar desde el saldo disponible
 *
 * Todo opera sobre la cuenta Express del merchant (stripeAccount header).
 * El merchant nunca necesita entrar en Stripe Dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { requireAuth, AuthError, getUserPrimaryAccount } from "@/lib/auth";
import { checkRateLimit }            from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ─── GET — balance + historial de payouts ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const account  = await getUserPrimaryAccount(user.id);

    const hasRealAccount =
      account?.stripeAccountId && !account.stripeAccountId.startsWith("local_");

    if (!hasRealAccount || !account) {
      return NextResponse.json({
        balance:   { available: 0, pending: 0, currency: "eur" },
        payouts:   [],
        schedule:  "weekly",
        canPayout: false,
      });
    }

    const stripeOpts = { stripeAccount: account.stripeAccountId };
    const currency   = account.defaultCurrency ?? "eur";

    const [balance, payoutList] = await Promise.all([
      stripe.balance.retrieve({}, stripeOpts).catch(() => null),
      stripe.payouts.list({ limit: 30 }, stripeOpts)
        .then((r) => r.data)
        .catch(() => [] as import("stripe").default.Payout[]),
    ]);

    const available = balance?.available.find((b) => b.currency === currency)?.amount ?? 0;
    const pending   = balance?.pending.find((b) => b.currency === currency)?.amount   ?? 0;

    return NextResponse.json({
      balance:  { available, pending, currency },
      payouts:  payoutList.map((p) => ({
        id:          p.id,
        amount:      p.amount,
        currency:    p.currency,
        status:      p.status,
        method:      p.method,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        description: p.description,
        createdAt:   new Date(p.created * 1000).toISOString(),
      })),
      schedule:  account.payoutSchedule ?? "WEEKLY",
      canPayout: available >= 100 && account.chargesEnabled,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[payouts GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ─── POST — solicitar payout estándar ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const rl = checkRateLimit(`payouts-request:${user.id}`, { windowMs: 60_000, max: 5 });
    if (!rl.success) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
    }

    const account = await getUserPrimaryAccount(user.id);
    if (!account?.stripeAccountId || account.stripeAccountId.startsWith("local_")) {
      return NextResponse.json(
        { error: "Activa tu cuenta de cobros antes de solicitar un payout." },
        { status: 422 },
      );
    }
    if (!account.chargesEnabled) {
      return NextResponse.json(
        { error: "Tu cuenta aún no tiene cobros activados. Completa la verificación primero." },
        { status: 422 },
      );
    }

    const body     = await req.json().catch(() => ({})) as { amount?: number; currency?: string };
    const currency = (body.currency ?? account.defaultCurrency ?? "eur").toLowerCase();
    const stripeOpts = { stripeAccount: account.stripeAccountId };

    // Obtener saldo disponible real
    const balance   = await stripe.balance.retrieve({}, stripeOpts);
    const available = balance.available.find((b) => b.currency === currency)?.amount ?? 0;

    if (available < 100) {
      return NextResponse.json(
        { error: "Saldo disponible insuficiente. Mínimo €1,00 para solicitar un payout." },
        { status: 400 },
      );
    }

    const amount = body.amount
      ? Math.min(Math.max(body.amount, 100), available)
      : available;

    // Crear payout en la cuenta Express del merchant
    const payout = await stripe.payouts.create(
      { amount, currency, description: "Payout solicitado desde PayForce" },
      stripeOpts,
    );

    // Registrar en BD
    await db.payout.upsert({
      where:  { stripePayoutId: payout.id },
      create: {
        stripePayoutId:     payout.id,
        connectedAccountId: account.id,
        amount:             payout.amount,
        currency:           payout.currency,
        status:             payout.status.toUpperCase(),
        method:             "STANDARD",
        arrivalDate:        new Date(payout.arrival_date * 1000),
        description:        payout.description ?? null,
      },
      update: { status: payout.status.toUpperCase() },
    });

    return NextResponse.json({
      ok:          true,
      payoutId:    payout.id,
      amount:      payout.amount,
      currency:    payout.currency,
      status:      payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
      message:     `Payout de ${(payout.amount / 100).toFixed(2)} € en proceso. Llegará en 1–3 días hábiles.`,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    const msg = err instanceof Error ? err.message : "Error interno";
    console.error("[payouts POST]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
