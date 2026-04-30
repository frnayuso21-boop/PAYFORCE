import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError }   from "@/lib/auth";
import { db }                        from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── GET /api/dashboard/impagos ──────────────────────────────────────────────
// Devuelve:
//  - Pagos fallidos del merchant (Payment con status FAILED)
//  - Cobros fallidos de suscripción (BatchResult con status FAILED)
//  - Resumen: total impagado, número de registros, tasa de fallo

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    const session = await requireAuth(req);
    userId = session.user.id;
  } catch (err) {
    if (err instanceof AuthError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const account = await db.connectedAccount.findFirst({
    where:  { userId },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const skip     = (page - 1) * limit;
  const source   = searchParams.get("source") ?? "all"; // "payments" | "subscriptions" | "all"
  const from     = searchParams.get("from");
  const to       = searchParams.get("to");

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to   ? { lte: new Date(to)   } : {}),
  };

  // ── Pagos directos fallidos ───────────────────────────────────────────────
  const [failedPayments, failedPaymentsTotal] =
    source === "subscriptions"
      ? [[], 0]
      : await Promise.all([
          db.payment.findMany({
            where: {
              connectedAccountId: account.id,
              status: "FAILED",
              ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
            },
            orderBy: { createdAt: "desc" },
            skip,
            take:  limit,
            select: {
              id: true,
              stripePaymentIntentId: true,
              amount: true,
              currency: true,
              status: true,
              description: true,
              customerEmail: true,
              customerName: true,
              failureCode: true,
              failureMessage: true,
              createdAt: true,
            },
          }),
          db.payment.count({
            where: {
              connectedAccountId: account.id,
              status: "FAILED",
              ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
            },
          }),
        ]);

  // ── Cobros de suscripción fallidos ────────────────────────────────────────
  const [failedBatchResults, failedBatchTotal] =
    source === "payments"
      ? [[], 0]
      : await Promise.all([
          db.batchResult.findMany({
            where: {
              batchJob: { connectedAccountId: account.id },
              status: "FAILED",
              ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
            },
            orderBy: { createdAt: "desc" },
            skip,
            take:  limit,
            select: {
              id: true,
              externalRef: true,
              customerName: true,
              amount: true,
              currency: true,
              status: true,
              failureReason: true,
              createdAt: true,
              batchJob: { select: { id: true, createdAt: true } },
              customer: { select: { id: true, email: true, phone: true } },
            },
          }),
          db.batchResult.count({
            where: {
              batchJob: { connectedAccountId: account.id },
              status: "FAILED",
              ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
            },
          }),
        ]);

  // ── Resumen global (sin paginación) ──────────────────────────────────────
  const [allFailedPaymentsSum, allBatchResultsSum, totalPaymentsCount, totalBatchCount] =
    await Promise.all([
      db.payment.aggregate({
        where: { connectedAccountId: account.id, status: "FAILED" },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      db.batchResult.aggregate({
        where: {
          batchJob: { connectedAccountId: account.id },
          status: "FAILED",
        },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      db.payment.count({ where: { connectedAccountId: account.id } }),
      db.batchResult.count({ where: { batchJob: { connectedAccountId: account.id } } }),
    ]);

  const totalFailedAmount =
    (allFailedPaymentsSum._sum.amount ?? 0) + (allBatchResultsSum._sum.amount ?? 0);
  const totalFailedCount =
    (allFailedPaymentsSum._count.id ?? 0) + (allBatchResultsSum._count.id ?? 0);
  const totalAllCount   = totalPaymentsCount + totalBatchCount;
  const failureRate     = totalAllCount > 0
    ? Math.round((totalFailedCount / totalAllCount) * 100 * 10) / 10
    : 0;

  return NextResponse.json({
    summary: {
      totalFailedAmount,
      totalFailedCount,
      failedPayments:          allFailedPaymentsSum._count.id  ?? 0,
      failedSubscriptions:     allBatchResultsSum._count.id    ?? 0,
      failureRate,
    },
    failedPayments: {
      data:  failedPayments,
      total: failedPaymentsTotal,
      page,
      limit,
    },
    failedSubscriptions: {
      data:  failedBatchResults,
      total: failedBatchTotal,
      page,
      limit,
    },
  });
}
