import { NextRequest }            from "next/server";
import { db }                     from "@/lib/db";
import { requireApiKey, apiOk, apiError, ApiAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments
 * Lista los pagos del merchant autenticado.
 *
 * Query params:
 *   limit   (default 20, max 100)
 *   cursor  (ID del último pago para paginación)
 *   status  (SUCCEEDED | FAILED | PROCESSING | CANCELED)
 *
 * @example
 * curl https://payforce.io/api/v1/payments \
 *   -H "Authorization: Bearer pf_live_..."
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiKey(req);
    const { searchParams } = new URL(req.url);

    const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "20"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const payments = await db.payment.findMany({
      where:   {
        connectedAccountId: ctx.accountId,
        ...(status && { status: status.toUpperCase() }),
      },
      orderBy: { createdAt: "desc" },
      take:    limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true, stripePaymentIntentId: true, amount: true, currency: true,
        status: true, description: true, applicationFeeAmount: true, netAmount: true,
        customerEmail: true, customerName: true, createdAt: true, capturedAt: true,
        paymentLinkId: true,
      },
    });

    const hasMore = payments.length > limit;
    const data    = hasMore ? payments.slice(0, -1) : payments;

    return apiOk({
      object:   "list",
      data,
      has_more: hasMore,
      next_cursor: hasMore ? data[data.length - 1]?.id : null,
    });
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, "authentication_error", e.message);
    return apiError(500, "internal_error", "Error interno del servidor.");
  }
}

/**
 * POST /api/v1/payments
 * Crea un nuevo PaymentIntent.
 *
 * Body: { amount: number (cents), currency: string, description?: string, customer_email?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx  = await requireApiKey(req);
    const body = await req.json();

    const { amount, currency = "eur", description, customer_email, customer_name } = body;
    if (!amount || typeof amount !== "number" || amount < 50) {
      return apiError(422, "invalid_param", "'amount' debe ser un entero en céntimos ≥ 50.");
    }

    const { stripe }    = await import("@/lib/stripe");
    const account       = await db.connectedAccount.findUnique({ where: { id: ctx.accountId } });
    if (!account?.stripeAccountId) {
      return apiError(422, "account_not_ready", "Cuenta Stripe no configurada.");
    }

    const FEE_PERCENT   = 0.04;
    const FEE_FIXED     = 40; // 0,40€ in cents
    const applicationFeeAmount = Math.round(amount * FEE_PERCENT) + FEE_FIXED;

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email: customer_email,
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: account.stripeAccountId },
    });

    const payment = await db.payment.create({
      data: {
        connectedAccountId:   ctx.accountId,
        stripePaymentIntentId: pi.id,
        amount,
        currency,
        status:               "PROCESSING",
        description:          description ?? null,
        customerEmail:        customer_email ?? null,
        customerName:         customer_name  ?? null,
        applicationFeeAmount,
        netAmount:            amount - applicationFeeAmount,
      },
    });

    return apiOk({
      id:             payment.id,
      stripe_id:      pi.id,
      client_secret:  pi.client_secret,
      amount,
      currency,
      status:         "processing",
    }, 201);
  } catch (e) {
    if (e instanceof ApiAuthError) return apiError(e.status, "authentication_error", e.message);
    console.error(e);
    return apiError(500, "internal_error", "Error interno del servidor.");
  }
}
