/**
 * POST /api/billing/batch/[batchId]/execute
 * Ejecuta los cobros off_session para todas las líneas PENDING del batch.
 * Irrevocable — confirma con el merchant antes de llamar.
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe }                    from "@/lib/stripe";
import { db }                        from "@/lib/db";
import { createSupabaseServer }      from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const account = await db.connectedAccount.findFirst({
    where:  { userId: dbUser.id },
    select: { id: true, stripeAccountId: true, chargesEnabled: true },
  });
  if (!account) return NextResponse.json({ error: "No connected account" }, { status: 404 });

  if (!account.chargesEnabled) {
    return NextResponse.json({ error: "Stripe charges are not enabled for this account" }, { status: 403 });
  }

  const batch = await db.batchJob.findFirst({
    where: { id: batchId, connectedAccountId: account.id },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status === "COMPLETED") {
    return NextResponse.json({ error: "Batch already completed" }, { status: 409 });
  }
  if (batch.status === "PROCESSING") {
    return NextResponse.json({ error: "Batch is already being processed" }, { status: 409 });
  }

  // Marcar como en progreso
  await db.batchJob.update({ where: { id: batchId }, data: { status: "PROCESSING" } });

  // Cargar líneas pendientes con sus clientes
  const pending = await db.batchResult.findMany({
    where:   { batchJobId: batchId, status: "PENDING" },
    include: {
      customer: {
        select: { stripeCustomerId: true, stripePaymentMethodId: true },
      },
    },
  });

  let successCount = 0;
  let failedCount  = 0;

  for (const result of pending) {
    const { customer } = result;
    if (!customer?.stripePaymentMethodId) {
      await db.batchResult.update({
        where: { id: result.id },
        data:  { status: "NO_CARD", failureReason: "No payment method on file" },
      });
      failedCount++;
      continue;
    }

    const fee = Math.round(result.amount * 0.029) + 30; // 2.9% + 30 céntimos

    try {
      const pi = await stripe.paymentIntents.create({
        amount:                 result.amount,
        currency:               result.currency,
        customer:               customer.stripeCustomerId,
        payment_method:         customer.stripePaymentMethodId,
        confirm:                true,
        off_session:            true,
        application_fee_amount: fee,
        transfer_data:          { destination: account.stripeAccountId },
        description:            result.customerName,
        metadata: {
          batchJobId:  batchId,
          externalRef: result.externalRef,
          endToEndId:  result.endToEndId ?? "",
          connectedAccountId: account.id,
        },
      });

      await db.batchResult.update({
        where: { id: result.id },
        data:  { status: "SUCCESS", paymentIntentId: pi.id },
      });
      successCount++;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.batchResult.update({
        where: { id: result.id },
        data:  { status: "FAILED", failureReason: msg },
      });
      failedCount++;
    }
  }

  // Finalizar batch
  await db.batchJob.update({
    where: { id: batchId },
    data: {
      status:       "COMPLETED",
      processedAt:  new Date(),
      successCount: { increment: successCount },
      failedCount:  { increment: failedCount },
    },
  });

  return NextResponse.json({
    batchJobId:   batchId,
    total:        pending.length,
    successCount,
    failedCount,
    status:       "COMPLETED",
  });
}
