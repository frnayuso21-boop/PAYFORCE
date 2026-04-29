import { NextRequest, NextResponse }              from "next/server";
import { db }                                     from "@/lib/db";
import { requireAuth, getUserAccountIds, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);

    const accountIds = await getUserAccountIds(user.id);
    if (!accountIds.length) return NextResponse.json({ splits: [] });

    const splits = await db.merchantSplit.findMany({
      where:   { connectedAccountId: { in: accountIds } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ splits }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dashboard/splits]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
