import { NextRequest, NextResponse }              from "next/server";
import { db }                                     from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);

    const accountIds = await getUserAccountIds(user.id);
    if (!accountIds.length) return NextResponse.json({ payments: [] });

    const payments = await db.payment.findMany({
      where:   { connectedAccountId: { in: accountIds } },
      orderBy: { createdAt: "desc" },
      take:    limit,
    });

    return NextResponse.json({ payments });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dashboard/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
