import { NextRequest, NextResponse } from "next/server";
import { withAdmin }                 from "@/lib/admin-auth";
import { db }                        from "@/lib/db";

export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "";
  const type   = searchParams.get("type")   ?? "";
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = 30;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type)   where.type   = { contains: type };

  const [events, total] = await Promise.all([
    db.webhookEvent.findMany({
      where,
      skip:    offset,
      take:    limit,
      orderBy: { processedAt: "desc" },
    }),
    db.webhookEvent.count({ where }),
  ]);

  return NextResponse.json({ events, total, page, limit });
});
