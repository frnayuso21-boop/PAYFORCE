import { NextRequest, NextResponse } from "next/server";
import { db }                        from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/payments
 * Lista paginada de pagos del usuario autenticado desde la BD local.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const { searchParams } = req.nextUrl;
    const rawLimit = parseInt(searchParams.get("limit")  ?? "20", 10);
    const rawPage  = parseInt(searchParams.get("page")   ?? "1",  10);
    const status   = searchParams.get("status")   ?? undefined;
    const currency = searchParams.get("currency") ?? undefined;

    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const page  = Math.max(rawPage, 1);
    const skip  = (page - 1) * limit;

    // Filtrar por las cuentas del usuario
    const accountIds = await getUserAccountIds(user.id);

    // Sin cuentas conectadas → no mostrar pagos ajenos (seguridad)
    if (accountIds.length === 0) {
      return NextResponse.json({
        data: [],
        meta: { total: 0, page: 1, limit, totalPages: 0, hasMore: false },
      });
    }

    const accountFilter = { connectedAccountId: { in: accountIds } };
    const where = {
      ...accountFilter,
      ...(status   && { status:   status.toUpperCase() }),
      ...(currency && { currency: currency.toLowerCase() }),
    };

    const [rows, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id:                    true,
          stripePaymentIntentId: true,
          amount:                true,
          currency:              true,
          status:                true,
          applicationFeeAmount:  true,
          refundedAmount:        true,
          description:           true,
          failureCode:           true,
          failureMessage:        true,
          stripeCreatedAt:       true,
          createdAt:             true,
          capturedAt:            true,
          connectedAccount: {
            select: { stripeAccountId: true, businessName: true },
          },
        },
      }),
      db.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore:    page < Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api/payments]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
