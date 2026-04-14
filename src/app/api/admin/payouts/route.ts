import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { db }                        from "@/lib/db";

export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "PENDING";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const where = status === "ALL" ? {} : { status };

  const [requests, total] = await Promise.all([
    db.instantPayoutRequest.findMany({
      where,
      skip:    offset,
      take:    limit,
      orderBy: { createdAt: "desc" },
      include: {
        connectedAccount: {
          select: { businessName: true, email: true, user: { select: { email: true, name: true } } },
        },
      },
    }),
    db.instantPayoutRequest.count({ where }),
  ]);

  return NextResponse.json({ requests, total, page, limit });
});

export const PATCH = withAdmin(async (req: NextRequest) => {
  const { id, status, notes, stripePayoutId } = await req.json() as {
    id: string; status: string; notes?: string; stripePayoutId?: string;
  };

  if (!id || !status) {
    return NextResponse.json({ error: "id y status son requeridos" }, { status: 400 });
  }

  const allowed = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "status no válido" }, { status: 400 });
  }

  const updated = await db.instantPayoutRequest.update({
    where: { id },
    data:  {
      status,
      notes:         notes        ?? undefined,
      stripePayoutId: stripePayoutId ?? undefined,
      processedAt:   status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ request: updated });
});
