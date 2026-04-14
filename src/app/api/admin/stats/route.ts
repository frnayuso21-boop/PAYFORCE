import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { db }                        from "@/lib/db";

export const GET = withAdmin(async (_req: NextRequest) => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1); // inicio del mes

  const [
    totalMerchants,
    activeMerchants,
    totalPayments,
    monthPayments,
    totalRevenue,
    monthRevenue,
    platformFees,
    monthFees,
    pendingPayouts,
    openDisputes,
    totalSubscriptions,
    recentPayments,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { connectedAccounts: { some: { chargesEnabled: true } } } }),
    db.payment.count({ where: { status: "SUCCEEDED" } }),
    db.payment.count({ where: { status: "SUCCEEDED", createdAt: { gte: start } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED", createdAt: { gte: start } } }),
    db.merchantSplit.aggregate({ _sum: { platformFee: true } }),
    db.merchantSplit.aggregate({ _sum: { platformFee: true }, where: { createdAt: { gte: start } } }),
    db.instantPayoutRequest.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: { in: ["needs_response", "NEEDS_RESPONSE", "under_review", "UNDER_REVIEW", "warning_needs_response"] } } }),
    db.connectedAccount.count({ where: { /* subscriptions would be tracked here */ } }),
    db.payment.findMany({
      where:   { status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      take:    10,
      select:  {
        id: true, amount: true, currency: true, createdAt: true,
        connectedAccount: { select: { businessName: true, email: true } },
        customer:         { select: { name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({
    merchants: { total: totalMerchants, active: activeMerchants },
    payments:  { total: totalPayments, month: monthPayments },
    revenue:   {
      total: totalRevenue._sum.amount ?? 0,
      month: monthRevenue._sum.amount ?? 0,
    },
    fees: {
      total: platformFees._sum.platformFee ?? 0,
      month: monthFees._sum.platformFee    ?? 0,
    },
    pendingPayouts,
    openDisputes,
    totalSubscriptions,
    recentPayments,
  });
});
