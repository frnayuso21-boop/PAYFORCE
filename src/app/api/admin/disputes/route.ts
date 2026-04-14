import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { db }                        from "@/lib/db";

export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [disputes, total] = await Promise.all([
    db.dispute.findMany({
      where,
      skip:    offset,
      take:    limit,
      orderBy: { createdAt: "desc" },
      include: {
        connectedAccount: { select: { businessName: true, email: true } },
        payment:          { select: { amount: true, currency: true, stripePaymentIntentId: true } },
      },
    }),
    db.dispute.count({ where }),
  ]);

  return NextResponse.json({ disputes, total, page, limit });
});
