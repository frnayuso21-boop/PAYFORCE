import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, webhookSecret } from "@/lib/stripe";
import { db } from "@/lib/db";
import { resolveConnectStatus } from "@/lib/connect";
import { sendPaymentReceiptEmail } from "@/lib/email";

export const runtime = "nodejs";

const log = {
  info:  (event: string, data?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "INFO",  event, ...data, ts: new Date().toISOString() })),
  warn:  (event: string, data?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "WARN",  event, ...data, ts: new Date().toISOString() })),
  error: (event: string, data?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "ERROR", event, ...data, ts: new Date().toISOString() })),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER — responde 200 de inmediato, procesa en background
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  // 1. Leer raw body (NUNCA req.json() — invalida la firma)
  const rawBody   = await req.text();
  const signature = req.headers.get("stripe-signature");

  console.log("=== WEBHOOK DEBUG ===");
  console.log("Body length:", rawBody.length);
  console.log("Signature:", signature?.substring(0, 20));
  console.log("Secret exists:", !!process.env.STRIPE_WEBHOOK_SECRET);
  console.log("Secret prefix:", process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10));

  if (!signature) {
    log.warn("webhook.rejected", { reason: "missing_signature" });
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // 2. Verificar firma HMAC — falla rápido si es inválida
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("=== WEBHOOK SIGNATURE ERROR ===", msg);
    console.error("Body preview:", rawBody.substring(0, 100));
    log.warn("webhook.rejected", { reason: "invalid_signature", detail: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  log.info("webhook.received", { eventId: event.id, type: event.type });

  // 3. Procesar de forma síncrona en local — garantiza que la BD se actualiza
  //    antes de devolver 200 (evita que el runtime mate el proceso en background)
  await processEvent(event);

  return NextResponse.json({ received: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESAMIENTO EN BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════════
async function processEvent(event: Stripe.Event) {
  const startedAt = Date.now();

  // Idempotencia real en BD
  try {
    await db.webhookEvent.create({
      data: { id: event.id, type: event.type, status: "PROCESSING" },
    });
  } catch {
    log.info("webhook.skipped", { eventId: event.id, reason: "already_processed" });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, event.id, event.account ?? null);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute, event.id);
        break;
      case "charge.dispute.closed":
        await handleDisputeClosed(event.data.object as Stripe.Dispute, event.id);
        break;
      case "payout.paid":
        await handlePayoutPaid(event.data.object as Stripe.Payout, event.id);
        break;
      case "payout.failed":
        await handlePayoutFailed(event.data.object as Stripe.Payout, event.id);
        break;
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account, event.id);
        break;
      case "account.application.deauthorized":
        await handleAccountDeauthorized(event.data.object as Stripe.Application, event.id, event.account ?? null);
        break;
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent, event.id);
        break;
      default:
        log.info("webhook.unhandled", { eventId: event.id, type: event.type });
    }

    await db.webhookEvent.update({
      where: { id: event.id },
      data:  { status: "PROCESSED" },
    });

    log.info("webhook.processed", {
      eventId: event.id, type: event.type,
      durationMs: Date.now() - startedAt,
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error("webhook.process_error", {
      eventId: event.id, type: event.type,
      error: errMsg, durationMs: Date.now() - startedAt,
    });
    await db.webhookEvent.update({
      where: { id: event.id },
      data:  { status: "FAILED", error: errMsg },
    }).catch(() => null);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLERS DE EVENTOS
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent, eventId: string, eventAccount: string | null) {
  log.info("payment.succeeded", { eventId, paymentIntentId: pi.id, amount: pi.amount });

  // Cobro masivo de suscripciones: actualizar lastChargeAt/lastChargeAmount
  if (pi.metadata?.batchMonth) {
    if (pi.customer) {
      await db.subscriptionCustomer.updateMany({
        where: { stripeCustomerId: String(pi.customer) },
        data:  { lastChargeAt: new Date(), lastChargeAmount: pi.amount },
      });
    }
    // No interrumpir — continuar con el flujo normal para registrar el pago
  }

  // event.account es la fuente más fiable para eventos de cuentas conectadas.
  // Fallbacks: transfer_data.destination y metadata.stripeAccountId.
  const stripeAccountId =
    eventAccount ??
    (pi.transfer_data?.destination as string | undefined) ??
    pi.metadata?.stripeAccountId ??
    null;

  console.log("=== PAYMENT WEBHOOK ===");
  console.log("event.account:", eventAccount);
  console.log("stripeAccountId encontrado:", stripeAccountId);

  const platformFee = pi.application_fee_amount ?? (
    pi.metadata?.platformFee ? parseInt(pi.metadata.platformFee, 10) : 0
  );
  const netAmount = pi.amount - platformFee;

  if (!stripeAccountId) {
    log.warn("payment.succeeded.no_destination", {
      eventId, paymentIntentId: pi.id,
      reason: "event.account y transfer_data.destination ausentes — posible pago de plataforma sin merchant",
    });
    return;
  }

  const account = await db.connectedAccount.findFirst({ where: { stripeAccountId } });
  console.log("account en BD:", account?.id ?? "NO ENCONTRADO");
  if (!account) {
    log.warn("payment.succeeded.account_not_found", { eventId, stripeAccountId });
    return;
  }

  const payment = await db.payment.upsert({
    where:  { stripePaymentIntentId: pi.id },
    create: {
      stripePaymentIntentId: pi.id,
      stripeChargeId:        typeof pi.latest_charge === "string" ? pi.latest_charge : null,
      connectedAccountId:    account.id,
      amount:                pi.amount,
      currency:              pi.currency,
      applicationFeeAmount:  platformFee,
      netAmount,
      status:                "SUCCEEDED",
      description:           pi.description ?? null,
      metadata:              Object.keys(pi.metadata ?? {}).length ? JSON.stringify(pi.metadata) : null,
      stripeCreatedAt:       new Date(pi.created * 1000),
      capturedAt:            new Date(),
    },
    update: {
      status:               "SUCCEEDED",
      stripeChargeId:       typeof pi.latest_charge === "string" ? pi.latest_charge : null,
      applicationFeeAmount: platformFee,
      netAmount,
      capturedAt:           new Date(),
    },
  });

  // MerchantSplit: registro de reporting interno.
  // Con Destination Charges Stripe transfiere el neto al merchant automáticamente.
  // status = "paid" desde el primer momento (no hay liquidación manual pendiente).
  const existingSplit = await db.merchantSplit.findUnique({ where: { paymentId: payment.id } });
  if (!existingSplit && netAmount > 0) {
    await db.merchantSplit.create({
      data: {
        paymentId:          payment.id,
        connectedAccountId: account.id,
        totalAmount:        pi.amount,
        platformFee,
        amountToPayMerchant: netAmount,
        status:             "paid",
        paidAt:             new Date(),
      },
    });
    log.info("merchant_split.created", { eventId, paymentId: payment.id, platformFee, netAmount });
  }

  // PaymentLink — marcar como pagado
  const token = pi.metadata?.paymentLinkToken;
  if (token) {
    const link = await db.paymentLink.findFirst({ where: { token } });
    await db.paymentLink.updateMany({
      where: { token, status: "open" },
      data:  { status: "paid", usedCount: { increment: 1 } },
    });
    if (link) {
      await db.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data:  { paymentLinkId: link.id },
      });
    }
    log.info("payment_link.paid", { eventId, token });
  }

  // Email de confirmación al pagador — no bloquea el webhook si falla
  if (pi.receipt_email) {
    sendPaymentReceiptEmail({
      to:              pi.receipt_email,
      merchantName:    account.businessName || "PayForce",
      amount:          pi.amount,
      currency:        pi.currency,
      description:     pi.description ?? null,
      paymentIntentId: pi.id,
      createdAt:       new Date(pi.created * 1000),
    }).catch((err: unknown) => {
      log.warn("payment.receipt_email.failed", {
        eventId,
        paymentIntentId: pi.id,
        to: pi.receipt_email,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent, eventId: string) {
  log.warn("payment.failed", { eventId, paymentIntentId: pi.id });
  await db.payment.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data: {
      status:         "FAILED",
      failureCode:    pi.last_payment_error?.code    ?? null,
      failureMessage: pi.last_payment_error?.message ?? null,
    },
  });

  // Si el fallo viene de un cobro masivo → actualizar BatchResult
  const batchJobId = pi.metadata?.batchJobId;
  if (batchJobId) {
    const failureReason = pi.last_payment_error?.message ?? pi.last_payment_error?.code ?? "unknown";
    await db.batchResult.updateMany({
      where: { paymentIntentId: pi.id },
      data:  { status: "FAILED", failureReason },
    });
    // Incrementar failedCount del batch
    await db.batchJob.update({
      where: { id: batchJobId },
      data:  { failedCount: { increment: 1 } },
    }).catch(() => null);
    log.warn("batch.payment_failed", { eventId, batchJobId, paymentIntentId: pi.id, failureReason });
  }
}

// ── setup_intent.succeeded — guardar payment method en SubscriptionCustomer ──
async function handleSetupIntentSucceeded(si: Stripe.SetupIntent, eventId: string) {
  log.info("setup_intent.succeeded", { eventId, setupIntentId: si.id });

  const paymentMethodId   = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
  const connectedAccountId = si.metadata?.connectedAccountId;
  const customerId         = si.metadata?.customerId;
  const cardInvitationId   = si.metadata?.cardInvitationId;

  if (!customerId || !paymentMethodId) {
    log.warn("setup_intent.missing_metadata", { eventId, setupIntentId: si.id });
    return;
  }

  await db.subscriptionCustomer.update({
    where: { id: customerId },
    data:  {
      stripePaymentMethodId: paymentMethodId,
      status:                "ACTIVE",
    },
  });

  if (cardInvitationId) {
    await db.cardInvitation.updateMany({
      where: { id: cardInvitationId, usedAt: null },
      data:  { usedAt: new Date() },
    });
  }

  log.info("subscription_customer.card_saved", {
    eventId, customerId, paymentMethodId, connectedAccountId,
  });
}

async function handlePaymentCanceled(pi: Stripe.PaymentIntent, eventId: string) {
  log.info("payment.canceled", { eventId, paymentIntentId: pi.id });
  await db.payment.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data:  { status: "CANCELED" },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  log.info("charge.refunded", { eventId, chargeId: charge.id, amountRefunded: charge.amount_refunded });
  if (typeof charge.payment_intent === "string") {
    await db.payment.updateMany({
      where: { stripePaymentIntentId: charge.payment_intent },
      data:  { refundedAmount: charge.amount_refunded },
    });
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute, eventId: string) {
  log.warn("dispute.created", { eventId, disputeId: dispute.id, amount: dispute.amount });
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return;

  const payment = await db.payment.findFirst({ where: { stripeChargeId: chargeId } });
  if (!payment) return;

  await db.dispute.upsert({
    where:  { stripeDisputeId: dispute.id },
    create: {
      stripeDisputeId:    dispute.id,
      paymentId:          payment.id,
      connectedAccountId: payment.connectedAccountId,
      amount:             dispute.amount,
      currency:           dispute.currency,
      status:             dispute.status.toUpperCase(),
      reason:             dispute.reason,
      evidenceDueBy: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000)
        : null,
    },
    update: { status: dispute.status.toUpperCase() },
  });
}

async function handleDisputeClosed(dispute: Stripe.Dispute, eventId: string) {
  log.info("dispute.closed", { eventId, disputeId: dispute.id, status: dispute.status });
  await db.dispute.updateMany({
    where: { stripeDisputeId: dispute.id },
    data:  { status: dispute.status.toUpperCase() },
  });
}

async function handlePayoutPaid(payout: Stripe.Payout, eventId: string) {
  log.info("payout.paid", { eventId, payoutId: payout.id });
  await db.payout.updateMany({
    where: { stripePayoutId: payout.id },
    data:  { status: "PAID", arrivalDate: new Date(payout.arrival_date * 1000) },
  });
}

async function handlePayoutFailed(payout: Stripe.Payout, eventId: string) {
  log.error("payout.failed", { eventId, payoutId: payout.id, failureCode: payout.failure_code });
  await db.payout.updateMany({
    where: { stripePayoutId: payout.id },
    data: {
      status:         "FAILED",
      failureCode:    payout.failure_code    ?? null,
      failureMessage: payout.failure_message ?? null,
    },
  });
}

async function handleAccountUpdated(account: Stripe.Account, eventId: string) {
  log.info("connect.account_updated", { eventId, stripeAccountId: account.id });
  const status = resolveConnectStatus(account);
  await db.connectedAccount.updateMany({
    where: { stripeAccountId: account.id },
    data: {
      status,
      businessName:     account.business_profile?.name ?? "",
      defaultCurrency:  (account.default_currency as string) ?? "eur",
      chargesEnabled:   account.charges_enabled   ?? false,
      payoutsEnabled:   account.payouts_enabled    ?? false,
      detailsSubmitted: account.details_submitted  ?? false,
    },
  });
}

async function handleAccountDeauthorized(app: Stripe.Application, eventId: string, connectedAccountId: string | null) {
  // Stripe envía el acct_... del connected account en event.account, no en data.object.id
  // (data.object.id es el ID de la Application, no del merchant)
  const stripeAccountId = connectedAccountId ?? app.id;
  log.warn("connect.account_deauthorized", { eventId, stripeAccountId });
  await db.connectedAccount.updateMany({
    where: { stripeAccountId },
    data:  { status: "NOT_CONNECTED", chargesEnabled: false, payoutsEnabled: false },
  });
}

