/**
 * POST /api/subscriptions/payout/instant
 * Solicita un payout instantáneo del balance disponible del merchant.
 * Body: {} (usa la cuenta autenticada)
 */
import { NextResponse }         from "next/server";
import { stripe }               from "@/lib/stripe";
import { db }                   from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, stripeAccountId: true, payoutsEnabled: true, defaultCurrency: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });
  if (!account.payoutsEnabled) {
    return NextResponse.json({ error: "Payouts not enabled for this account" }, { status: 403 });
  }

  // Obtener balance disponible del merchant
  const balance = await stripe.balance.retrieve(
    {},
    { stripeAccount: account.stripeAccountId },
  );

  const currency  = account.defaultCurrency || "eur";
  const available = balance.available.find(b => b.currency === currency);
  const amount    = available?.amount ?? 0;

  if (amount <= 0) {
    return NextResponse.json({ error: "No available balance to pay out" }, { status: 400 });
  }

  // Crear payout instantáneo
  const payout = await stripe.payouts.create(
    {
      amount,
      currency,
      method:      "instant",
      description: `PayForce instant payout — ${new Date().toISOString().slice(0, 10)}`,
      metadata:    { connectedAccountId: account.id },
    },
    { stripeAccount: account.stripeAccountId },
  );

  // Registrar en BD
  await db.payout.create({
    data: {
      stripePayoutId:    payout.id,
      connectedAccountId: account.id,
      amount,
      currency,
      status:            "PENDING",
      method:            "INSTANT",
      arrivalDate:       new Date(payout.arrival_date * 1000),
      description:       payout.description ?? null,
    },
  });

  return NextResponse.json({
    payoutId:           payout.id,
    amount,
    currency,
    method:             "instant",
    estimatedArrival:   new Date(payout.arrival_date * 1000).toISOString(),
    amountFormatted:    new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount / 100),
  }, { status: 201 });
}
