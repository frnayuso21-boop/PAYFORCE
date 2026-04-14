import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { db }                        from "@/lib/db";

export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")  ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { email:            { contains: q, mode: "insensitive" as const } },
          { name:             { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip:    offset,
      take:    limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        connectedAccounts: {
          select: {
            id: true, businessName: true, status: true,
            chargesEnabled: true, payoutsEnabled: true,
            _count: { select: { payments: true, paymentLinks: true } },
          },
          take: 1,
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
});
