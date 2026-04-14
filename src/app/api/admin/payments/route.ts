import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { db }                        from "@/lib/db";

export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")      ?? "";
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = 25;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { stripePaymentIntentId: { contains: q } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      { customer: { name:  { contains: q, mode: "insensitive" } } },
    ];
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      skip:    offset,
      take:    limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, currency: true, status: true,
        applicationFeeAmount: true, description: true, createdAt: true,
        stripePaymentIntentId: true, refundedAmount: true,
        connectedAccount: { select: { businessName: true, email: true } },
        customer:         { select: { name: true, email: true } },
        paymentLink:      { select: { token: true } },
        merchantSplit:    { select: { platformFee: true, amountToPayMerchant: true } },
      },
    }),
    db.payment.count({ where }),
  ]);

  return NextResponse.json({ payments, total, page, limit });
});
